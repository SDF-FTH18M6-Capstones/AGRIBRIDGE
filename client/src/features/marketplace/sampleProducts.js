
import tomatoes from "../../assets/Tomatoes.jpg";
import kale from "../../assets/Kales.jpg";
import maize from "../../assets/maize.jpg";
import bananas from "../../assets/banana.jpg";
import onions from "../../assets/Onions.jpg";

export const categories = [
  "All",
  "Vegetables",
  "Fruits",
  "Grains",
  "Others",
];

export const sampleProducts = [
  {
    id: 1,
    name: "Fresh tomatoes",
    price: 120,
    unit: "kg",
    category: "Vegetables",
    location: "Nakuru",
    farmer: "Jane Wanjiku",
    image: tomatoes,
  },
  {
    id: 2,
    name: "Green kale",
    price: 40,
    unit: "bunch",
    category: "Vegetables",
    location: "Nakuru",
    farmer: "Jane Wanjiku",
    image: kale,
  },
  {
    id: 3,
    name: "Dry maize",
    price: 80,
    unit: "kg",
    category: "Grains",
    location: "Nakuru",
    farmer: "Jane Wanjiku",
    image: maize,
  },
  {
    id: 4,
    name: "Ripe bananas",
    price: 100,
    unit: "bunch",
    category: "Fruits",
    location: "Kisii",
    farmer: "Grace Atieno",
    image: bananas,
  },
  {
    id: 5,
    name: "Red onions",
    price: 90,
    unit: "kg",
    category: "Vegetables",
    location: "Nyeri",
    farmer: "David Kamau",
    image: onions,
  },
];
