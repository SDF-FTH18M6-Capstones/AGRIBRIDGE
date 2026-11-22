import { configureStore } from "@reduxjs/toolkit";
import productReducer from "../features/farmer/products/productSlice";

const store = configureStore({
  reducer: {
    farmerProducts: productReducer,
  },
});

export default store;