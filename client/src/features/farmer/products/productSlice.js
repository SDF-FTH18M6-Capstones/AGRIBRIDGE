
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../../services/api";


// Convert backend product into frontend format.
export const mapBackendProduct = (product) => {
  const quality = (product.quality || "").toLowerCase();

  const availability = quality.includes("soon")
    ? "Upcoming"
    : quality.includes("recent")
      ? "On farm"
      : "Ready";

  const statusMap = {
    available: "Active",
    sold_out: "Sold out",
    inactive: "Unavailable",
  };

  return {
    id: product.product_id,
    category_id: product.category_id,
    name: product.product_name,
    description: product.description || "",
    price: Number(product.price),
    qty: Number(product.quantity_available),
    unit: product.unit,
    availability,
    quality: product.quality || "",
    harvestDate: product.availability_date || "",
    status: statusMap[product.status] || "Unavailable",
    imageUrl: product.image_url || "",
  };
};

// Convert frontend product into backend format.
const mapFrontendProduct = (product) => {
  const statusMap = {
    Active: "available",
    "Sold out": "sold_out",
    Unavailable: "inactive",
    Archived: "inactive",
    Draft: "inactive",
  };

  const qualityMap = {
    Ready: "Ready for harvest",
    "On farm": "Recently harvested",
    Upcoming: "Ready soon",
  };

  return {
    category_id: Number(product.category_id),
    product_name: product.name,
    description: product.description || "",
    price: String(Number(product.price)),
    quantity_available: String(Number(product.qty)),
    unit: product.unit,
    quality:
      qualityMap[product.availability] ||
      product.quality ||
      "Ready for harvest",
    availability_date: product.harvestDate || null,
    status: statusMap[product.status] || "available",
  };
};

// Fetch farmer products.
export const fetchMyProducts = createAsyncThunk(
  "farmerProducts/fetchMyProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/products/mine");
      const products = response.data?.data;

      if (!Array.isArray(products)) {
        return rejectWithValue("Invalid products response from server.");
      }

      return products.map(mapBackendProduct);
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to load products."
      );
    }
  }
);

// Create product.
export const createProduct = createAsyncThunk(
  "farmerProducts/createProduct",
  async ({ payload, tempId }, { rejectWithValue }) => {
    try {
      const response = await api.post("/products", payload);
      const savedProduct = response.data?.data;

      if (!savedProduct?.product_id) {
        return rejectWithValue("Invalid product response from server.");
      }

      return {
        tempId,
        product: mapBackendProduct(savedProduct),
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to create product."
      );
    }
  }
);

// Update product.
export const updateProduct = createAsyncThunk(
  "farmerProducts/updateProduct",
  async ({ id, changes }, { getState, rejectWithValue }) => {
    try {
      const currentProduct = getState().farmerProducts.items.find(
        (product) => product.id === id
      );

      if (!currentProduct) {
        return rejectWithValue("Product not found.");
      }

      const updatedProduct = {
        ...currentProduct,
        ...changes,
      };

      const payload = mapFrontendProduct(updatedProduct);

      const response = await api.put(`/products/${id}`, payload);

      if (!response.data?.data) {
        return rejectWithValue("Invalid updated product response.");
      }

      return mapBackendProduct(response.data.data);
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to update product."
      );
    }
  }
);

// Delete product.
export const deleteProduct = createAsyncThunk(
  "farmerProducts/deleteProduct",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/products/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to delete product."
      );
    }
  }
);

const productSlice = createSlice({
  name: "farmerProducts",

  initialState: {
    items: [],
    loading: false,
    error: null,
    pendingIds: [],
  },

  reducers: {
    clearProductError(state) {
      state.error = null;
    },

    // Add a product immediately before the API responds.
    addOptimisticProduct(state, action) {
      state.items.unshift(action.payload);
    },

    // Remove a temporary product.
    removeOptimisticProduct(state, action) {
      state.items = state.items.filter(
        (product) => product.id !== action.payload
      );
    },

    // Update product immediately.
    updateOptimisticProduct(state, action) {
      const { id, changes } = action.payload;

      state.items = state.items.map((product) =>
        product.id === id
          ? { ...product, ...changes }
          : product
      );
    },

    // Restore previous product after failure.
    restoreProduct(state, action) {
      const previousProduct = action.payload;

      state.items = state.items.map((product) =>
        product.id === previousProduct.id
          ? previousProduct
          : product
      );
    },

  },

  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchMyProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // CREATE
      .addCase(createProduct.pending, (state, action) => {
        state.error = null;

        const optimisticProduct =
          action.meta.arg.optimisticProduct;

        if (optimisticProduct) {
          state.items.unshift(optimisticProduct);
        }
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        const { tempId, product } = action.payload;

        state.items = state.items.map((item) =>
          item.id === tempId ? product : item
        );
      })
      .addCase(createProduct.rejected, (state, action) => {
        const tempId = action.meta.arg.tempId;

        state.items = state.items.filter(
          (item) => item.id !== tempId
        );

        state.error = action.payload || action.error.message;
      })

      // UPDATE
      .addCase(updateProduct.pending, (state, action) => {
        const id = action.meta.arg.id;

        if (!state.pendingIds.includes(id)) {
          state.pendingIds.push(id);
        }

        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const updatedProduct = action.payload;

        state.items = state.items.map((item) =>
          item.id === updatedProduct.id
            ? updatedProduct
            : item
        );

        state.pendingIds = state.pendingIds.filter(
          (id) => id !== updatedProduct.id
        );
      })
      .addCase(updateProduct.rejected, (state, action) => {
        const id = action.meta.arg.id;

        state.pendingIds = state.pendingIds.filter(
          (pendingId) => pendingId !== id
        );

        state.error = action.payload || action.error.message;
      })

      // DELETE
      .addCase(deleteProduct.pending, (state, action) => {
        const id = action.meta.arg;

        if (!state.pendingIds.includes(id)) {
          state.pendingIds.push(id);
        }

        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (product) => product.id !== action.payload
        );

        state.pendingIds = state.pendingIds.filter(
          (id) => id !== action.payload
        );
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        const id = action.meta.arg;

        state.pendingIds = state.pendingIds.filter(
          (pendingId) => pendingId !== id
        );

        state.error = action.payload || action.error.message;
      });
  },
});

export const {
  clearProductError,
  addOptimisticProduct,
  removeOptimisticProduct,
  updateOptimisticProduct,
  restoreProduct,
} = productSlice.actions;

export default productSlice.reducer;
