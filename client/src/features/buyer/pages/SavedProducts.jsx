import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faTrashCan, faCartPlus } from '@fortawesome/free-solid-svg-icons';

const SavedProducts = () => {
  const [savedItems, setSavedItems] = useState([
    {
      id: 1,
      name: 'Grade 1 Hass Avocados',
      price: 'KSh 85 / kg',
      farmer: 'Kiambu Fresh Farms',
      verified: true,
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 2,
      name: 'Red Irish Potatoes',
      price: 'KSh 3,200 / 50kg bag',
      farmer: 'Nyandarua Harvest',
      verified: true,
      image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    },
  ]);

  const handleRemove = (id) => {
    setSavedItems(savedItems.filter(item => item.id !== id));
  };

  const handleAddToCart = (item) => {
    console.log('Added to cart from saved products:', item);
    alert(`Added ${item.name} to cart!`);
  };

  return (
    <div className="space-y-6">
      {/* Saved Section Card */}
      <div className="bg-white border border-gray-300 rounded-lg p-5 space-y-4">
        <h3 className="text-base font-bold text-gray-900">Saved</h3>

        {savedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-300 rounded-lg overflow-hidden flex flex-col justify-between"
              >
                {/* Product Image */}
                <div className="w-full h-40 bg-gray-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                  <p className="text-xs font-semibold text-gray-800">{item.price}</p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-1">
                    <span>{item.farmer}</span>
                    {item.verified && (
                      <span className="inline-flex items-center gap-1 text-[#143d24] bg-green-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        <FontAwesomeIcon icon={faCircleCheck} />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions: Add to cart & Remove */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#143d24] hover:bg-[#1c5231] text-white text-xs font-medium py-2 px-3 rounded-md transition-colors"
                  >
                    <FontAwesomeIcon icon={faCartPlus} />
                    <span>Add to cart</span>
                  </button>

                  <button
                    onClick={() => handleRemove(item.id)}
                    className="flex items-center justify-center p-2 text-gray-500 hover:text-red-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    title="Remove"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-md p-10 text-center text-sm text-gray-500">
            [Product card] *[Product card] *[Product card]
            <p className="text-xs text-gray-400 mt-2">
              No saved products. Each card: image, name, price, farmer, Verified badge, Add to cart, Remove[cite: 8].
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          Each card: image, name, price, farmer, Verified badge, Add to cart, Remove[cite: 8].
        </p>
      </div>
    </div>
  );
};

export default SavedProducts;