import os
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from urllib.parse import urlparse

from flask import (
    Blueprint,
    current_app,
    jsonify,
    request,
    send_from_directory,
    url_for,
)
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from io import BytesIO
from PIL import Image, UnidentifiedImageError

from app.extensions import db
from app.models import (
    Product,
    ProductImage,
    Category,
    FarmerProfile,
    PRODUCT_STATUSES,
)

from app.schemas.product_schema import (
    product_schema,
    product_list_schema,
    product_search_schema,
    ProductImageSchema,
)
products_bp = Blueprint("products", __name__)
product_image_schema = ProductImageSchema(many=True)
single_product_image_schema = ProductImageSchema()


@products_bp.get("/search")
def search_products():
    query = Product.query

    search = request.args.get("search", "").strip()
    category_id = request.args.get("category_id")
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")
    location = request.args.get("location", "").strip()
    availability = request.args.get("availability", "").strip().lower()

  
    if search:
        search_term = f"%{search}%"

        query = query.filter(
            or_(
                Product.product_name.ilike(search_term),
                Product.description.ilike(search_term)
            )
        )

   
    if category_id is not None:
        try:
            category_id = int(category_id)

            if category_id <= 0:
                raise ValueError

        except ValueError:
            return jsonify({
                "success": False,
                "message": "category_id must be a positive integer"
            }), 400

        query = query.filter(Product.category_id == category_id)

   
    if min_price is not None:
        try:
            min_price = Decimal(min_price)

            if not min_price.is_finite() or min_price < 0:
                raise ValueError

        except (InvalidOperation, ValueError):
            return jsonify({
                "success": False,
                "message": "min_price must be a valid non-negative number"
            }), 400

        query = query.filter(Product.price >= min_price)

   
    if max_price is not None:
        try:
            max_price = Decimal(max_price)

            if not max_price.is_finite() or max_price < 0:
                raise ValueError

        except (InvalidOperation, ValueError):
            return jsonify({
                "success": False,
                "message": "max_price must be a valid non-negative number"
            }), 400

        query = query.filter(Product.price <= max_price)

    
    if min_price is not None and max_price is not None:
        if min_price > max_price:
            return jsonify({
                "success": False,
                "message": "min_price cannot be greater than max_price"
            }), 400

   
    if location:
        query = query.join(Product.farmer).filter(
            FarmerProfile.location.ilike(f"%{location}%")
        )

    
    if availability:
        if availability not in PRODUCT_STATUSES:
            return jsonify({
                "success": False,
                "message": "Invalid availability status",
                "allowed_values": list(PRODUCT_STATUSES)
            }), 400

        query = query.filter(Product.status == availability)

   
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))

        if page < 1 or per_page < 1 or per_page > 100:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "page must be positive and per_page must be between 1 and 100"
        }), 400

    pagination = query.order_by(Product.product_id.asc()).paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    products_data = product_search_schema.dump(pagination.items)

    return jsonify({
        "success": True,
        "message": "Products retrieved successfully",
        "data": products_data,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total_items": pagination.total,
            "total_pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_previous": pagination.has_prev
        }
    }), 200


@products_bp.get("")
def get_products():
    products = Product.query.order_by(Product.product_id).all()

    return jsonify({
        "data": product_list_schema.dump(products)
    }), 200


@products_bp.get("/mine")
@jwt_required()
def get_my_products():
    user_id = int(get_jwt_identity())

    farmer_profile = FarmerProfile.query.filter_by(
        user_id=user_id
    ).first()

    if farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 403

    products = Product.query.filter_by(
        farmer_id=farmer_profile.farmer_id
    ).order_by(Product.product_id).all()

    return jsonify({
        "data": product_list_schema.dump(products)
    }), 200



@products_bp.get("/<int:product_id>")
def get_product(product_id):
    product = db.session.get(Product, product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    return jsonify({
        "data": product_schema.dump(product)
    }), 200


@products_bp.post("")
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())

    farmer_profile = FarmerProfile.query.filter_by(
        user_id=user_id
    ).first()

    if farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object"
            }
        }), 400

    try:
        validated_data = product_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid product data",
                "fields": error.messages
            }
        }), 400

    category = db.session.get(Category, validated_data["category_id"])

    if category is None:
        return jsonify({
            "error": {
                "code": "CATEGORY_NOT_FOUND",
                "message": "Selected category does not exist"
            }
        }), 404

    new_product = Product(
        farmer_id=farmer_profile.farmer_id,
        category_id=category.category_id,
        **{
            key: value
            for key, value in validated_data.items()
            if key != "category_id"
        }
    )

    db.session.add(new_product)
    db.session.commit()

    return jsonify({
        "message": "Product created successfully",
        "data": product_schema.dump(new_product)
    }), 201, {
        "Location": f"/api/products/{new_product.product_id}"
    }



@products_bp.put("/<int:product_id>")
@jwt_required()
def update_product(product_id):
    user_id = int(get_jwt_identity())

    product = db.session.get(Product, product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    farmer_profile = FarmerProfile.query.filter_by(
        user_id=user_id
    ).first()

    if farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 403

    if product.farmer_id != farmer_profile.farmer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to update this product"
            }
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object"
            }
        }), 400

    try:
        validated_data = product_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid product data",
                "fields": error.messages
            }
        }), 400

    category = db.session.get(Category, validated_data["category_id"])

    if category is None:
        return jsonify({
            "error": {
                "code": "CATEGORY_NOT_FOUND",
                "message": "Selected category does not exist"
            }
        }), 404

    for key, value in validated_data.items():
        setattr(product, key, value)

    db.session.commit()

    return jsonify({
        "message": "Product updated successfully",
        "data": product_schema.dump(product)
    }), 200

@products_bp.delete("/<int:product_id>")
@jwt_required()
def delete_product(product_id):
    user_id = int(get_jwt_identity())

    product = db.session.get(Product, product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    farmer_profile = FarmerProfile.query.filter_by(
        user_id=user_id
    ).first()

    if farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 403

    if product.farmer_id != farmer_profile.farmer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to delete this product"
            }
        }), 403

    db.session.delete(product)
    db.session.commit()

    return "", 204



@products_bp.get("/uploads/<path:filename>")
def serve_product_image(filename):
    upload_folder = os.path.join(
        current_app.instance_path, "uploads", "products"
    )
    return send_from_directory(upload_folder, filename)

@products_bp.get("/<int:product_id>/images")
def get_product_images(product_id):
    product = db.session.get(Product, product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    images = product_image_schema.dump(product.images)

    return jsonify({
        "success": True,
        "message": "Product images retrieved successfully",
        "data": images
    }), 200


@products_bp.post("/<int:product_id>/images")
@jwt_required()
def add_product_image(product_id):
    user_id = int(get_jwt_identity())

    farmer_profile = FarmerProfile.query.filter_by(
        user_id=user_id
    ).first()

    if farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 403

    product = db.session.get(Product, product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    if product.farmer_id != farmer_profile.farmer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You can only add images to your own products"
            }
        }), 403


    saved_file_path = None
    uploaded_file = request.files.get("image")

    if uploaded_file is not None:
        if not uploaded_file.filename:
            return jsonify({
                "error": {
                    "code": "INVALID_IMAGE",
                    "message": "Please select an image file"
                }
            }), 400

        safe_original_name = secure_filename(uploaded_file.filename)
        extension = os.path.splitext(safe_original_name)[1].lower()

        allowed_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }

        if extension not in allowed_types:
            return jsonify({
                "error": {
                    "code": "INVALID_IMAGE_TYPE",
                    "message": "Only JPG, JPEG, PNG, WEBP and GIF images are allowed"
                }
            }), 400

        if uploaded_file.mimetype != allowed_types[extension]:
            return jsonify({
                "error": {
                    "code": "INVALID_IMAGE_TYPE",
                    "message": "The uploaded file type does not match its extension"
                }
            }), 400

        uploaded_file.stream.seek(0, os.SEEK_END)
        file_size = uploaded_file.stream.tell()
        uploaded_file.stream.seek(0)

        if file_size > 5 * 1024 * 1024:
            return jsonify({
                "error": {
                    "code": "IMAGE_TOO_LARGE",
                    "message": "Image size must not exceed 5MB"
                }
            }), 400
        expected_formats = {
            ".jpg": "JPEG",
            ".jpeg": "JPEG",
            ".png": "PNG",
            ".webp": "WEBP",
            ".gif": "GIF",
        }

        try:
            uploaded_file.stream.seek(0)

            with Image.open(uploaded_file.stream) as image:
                actual_format = image.format
                image.verify()

            uploaded_file.stream.seek(0)

            with Image.open(uploaded_file.stream) as image:
                image.load()

        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError
        ):
            return jsonify({
                "error": {
                    "code": "INVALID_IMAGE_CONTENT",
                    "message": "The uploaded file is not a valid image"
                }
            }), 400

        if actual_format != expected_formats[extension]:
            return jsonify({
                "error": {
                    "code": "INVALID_IMAGE_CONTENT",
                    "message": "The actual image format does not match its file extension"
                }
            }), 400

        uploaded_file.stream.seek(0)

        upload_folder = os.path.join(
            current_app.instance_path, "uploads", "products"
        )
        os.makedirs(upload_folder, exist_ok=True)

        stored_filename = f"{uuid4().hex}{extension}"
        saved_file_path = os.path.join(upload_folder, stored_filename)
        uploaded_file.save(saved_file_path)

        image_url = url_for(
            "products.serve_product_image",
            filename=stored_filename,
            _external=True
        )

    else:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "error": {
                    "code": "INVALID_JSON",
                    "message": "Request body must be a JSON object or an uploaded image file"
                }
            }), 400

        try:
            validated_data = single_product_image_schema.load(data)
        except ValidationError as error:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid image data",
                    "fields": error.messages
                }
            }), 400

        image_url = validated_data["image_url"]

    new_image = ProductImage(
        product_id=product_id,
        image_url=image_url
    )

    try:
        db.session.add(new_image)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()

        if saved_file_path and os.path.exists(saved_file_path):
            try:
                os.remove(saved_file_path)
            except OSError:
                current_app.logger.exception(
                    "Could not remove uploaded image after database failure"
                )

        current_app.logger.exception(
            "Could not save product image to the database"
        )

        return jsonify({
            "error": {
                "code": "IMAGE_SAVE_FAILED",
                "message": "Could not save the product image"
            }
        }), 500

    return jsonify({
        "success": True,
        "message": "Product image added successfully",
        "data": ProductImageSchema().dump(new_image)
    }), 201

@products_bp.delete("/<int:product_id>/images/<int:image_id>")
@jwt_required()
def delete_product_image(product_id, image_id):
    user_id = int(get_jwt_identity())

    farmer_profile = FarmerProfile.query.filter_by(
        user_id=user_id
    ).first()

    if farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 403

    product = db.session.get(Product, product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    if product.farmer_id != farmer_profile.farmer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You can only delete images from your own products"
            }
        }), 403

    image = ProductImage.query.filter_by(
        image_id=image_id,
        product_id=product_id
    ).first()

    if image is None:
        return jsonify({
            "error": {
                "code": "IMAGE_NOT_FOUND",
                "message": "Product image not found"
            }
        }), 404

    parsed_image_url = urlparse(image.image_url)
    image_filename = os.path.basename(parsed_image_url.path)

    expected_image_path = url_for(
        "products.serve_product_image",
        filename=image_filename
    )

    local_file_path = None

    if (
        parsed_image_url.netloc == urlparse(request.host_url).netloc
        and parsed_image_url.path == expected_image_path
        and image_filename
        and secure_filename(image_filename) == image_filename
    ):
        upload_folder = os.path.join(
            current_app.instance_path, "uploads", "products"
        )

        candidate_path = os.path.join(upload_folder, image_filename)

        if os.path.isfile(candidate_path):
            local_file_path = candidate_path

    db.session.delete(image)
    db.session.commit()

    if local_file_path:
        try:
            os.remove(local_file_path)
        except OSError:
            current_app.logger.exception(
                "Could not remove deleted product image file"
            )

    return "", 204