import React, { useState, useEffect, useReducer } from 'react';
import axios from 'axios';
import { ShoppingCart, User, PlusCircle } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

// Initial state for the shopping cart
const initialCartState = {
  items: [],
  total: 0,
};

// Reducer function for the shopping cart
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.items.find(item => item._id === action.payload._id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item._id === action.payload._id ? { ...item, quantity: item.quantity + 1 } : item
          ),
          total: state.total + action.payload.price,
        };
      } else {
        return {
          ...state,
          items: [...state.items, { ...action.payload, quantity: 1 }],
          total: state.total + action.payload.price,
        };
      }
    case 'REMOVE_FROM_CART':
      const itemToRemove = state.items.find(item => item._id === action.payload._id);
      if (itemToRemove.quantity > 1) {
        return {
          ...state,
          items: state.items.map(item =>
            item._id === action.payload._id ? { ...item, quantity: item.quantity - 1 } : item
          ),
          total: state.total - itemToRemove.price,
        };
      } else {
        return {
          ...state,
          items: state.items.filter(item => item._id !== action.payload._id),
          total: state.total - itemToRemove.price,
        };
      }
    case 'CLEAR_CART':
      return initialCartState;
    default:
      return state;
  }
};

const App = () => {
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('home'); // 'home', 'product', 'cart', 'login', 'register'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartState, dispatch] = useReducer(cartReducer, initialCartState);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  
  // Fetch products on component mount or when the view changes to 'home'
  useEffect(() => {
    if (view === 'home') {
      fetchProducts();
    }
  }, [view]);
  
  // Function to fetch products from the backend
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Function to handle adding a product to the cart
  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
    setMessage(`${product.name} added to cart!`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Function to handle user registration or login
  const handleAuthSubmit = async (e, type) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = type === 'register' ? 'register' : 'login';
      const response = await axios.post(`${API_BASE_URL}/${endpoint}`, authForm);
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setAuthForm({ name: '', email: '', password: '' });
      setView('home'); // Go back to home page after successful auth
    } catch (error) {
      console.error('Auth error:', error.response.data.msg);
      setAuthError(error.response.data.msg);
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setView('home');
  };

  // Function to handle checkout
  const handleCheckout = async () => {
    if (cartState.items.length === 0) {
      setMessage('Your cart is empty!');
      return;
    }

    if (!token) {
      setMessage('Please log in to checkout!');
      setTimeout(() => setView('login'), 1500);
      return;
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      };
      
      const orderData = {
        cartItems: cartState.items,
        totalPrice: cartState.total,
      };

      await axios.post(`${API_BASE_URL}/orders`, orderData, config);
      
      dispatch({ type: 'CLEAR_CART' });
      setMessage('Order placed successfully!');
      setTimeout(() => setView('home'), 1500);
    } catch (error) {
      console.error('Checkout error:', error.response ? error.response.data.msg : error.message);
      setMessage(error.response ? error.response.data.msg : 'Checkout failed. Please try again.');
    }
  };

  // Render different views based on state
  const renderView = () => {
    switch (view) {
      case 'cart':
        return (
          <div className="container mx-auto p-4 max-w-2xl bg-white shadow-xl rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Your Cart</h2>
            {cartState.items.length === 0 ? (
              <p className="text-center text-gray-500">Your cart is empty.</p>
            ) : (
              <div>
                {cartState.items.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-4 mb-4 bg-gray-50 rounded-lg shadow-sm">
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1 ml-4">
                      <h3 className="text-xl font-semibold text-gray-700">{item.name}</h3>
                      <p className="text-gray-500">Price: ${item.price}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <span className="font-bold text-lg">x{item.quantity}</span>
                      <button 
                        onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item })}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                        -
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-6 p-6 border-t-2 border-dashed border-gray-200">
                  <h3 className="text-2xl font-bold text-right text-gray-800">Total: ${cartState.total.toFixed(2)}</h3>
                  <div className="flex justify-end mt-4 space-x-4">
                    <button 
                      onClick={() => dispatch({ type: 'CLEAR_CART' })}
                      className="px-6 py-2 rounded-full bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition-colors">
                      Clear Cart
                    </button>
                    <button 
                      onClick={handleCheckout}
                      className="px-6 py-2 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors">
                      Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'product':
        return (
          selectedProduct && (
            <div className="container mx-auto p-4 bg-white shadow-xl rounded-2xl md:flex md:space-x-8">
              <div className="md:w-1/2">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-auto rounded-xl object-cover" />
              </div>
              <div className="md:w-1/2 mt-6 md:mt-0 flex flex-col justify-center">
                <h2 className="text-4xl font-bold mb-4 text-gray-900">{selectedProduct.name}</h2>
                <p className="text-xl font-semibold text-gray-700 mb-4">${selectedProduct.price}</p>
                <p className="text-gray-600 mb-6 leading-relaxed">{selectedProduct.description}</p>
                <button
                  onClick={() => handleAddToCart(selectedProduct)}
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-colors shadow-md">
                  Add to Cart
                </button>
              </div>
            </div>
          )
        );
      case 'login':
      case 'register':
        return (
          <div className="container mx-auto p-6 max-w-md bg-white shadow-xl rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
              {view === 'login' ? 'Login' : 'Register'}
            </h2>
            {authError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                <span className="block sm:inline">{authError}</span>
              </div>
            )}
            <form onSubmit={(e) => handleAuthSubmit(e, view)}>
              {view === 'register' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="shadow appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="shadow appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="shadow appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors focus:outline-none focus:shadow-outline">
                  {view === 'login' ? 'Login' : 'Register'}
                </button>
              </div>
            </form>
            <div className="mt-4 text-center">
              {view === 'login' ? (
                <button onClick={() => setView('register')} className="text-blue-500 hover:underline">
                  Don't have an account? Register
                </button>
              ) : (
                <button onClick={() => setView('login')} className="text-blue-500 hover:underline">
                  Already have an account? Login
                </button>
              )}
            </div>
          </div>
        );
      default: // 'home'
        return (
          <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Featured Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.length > 0 ? (
                products.map((product) => (
                  <div key={product._id} className="bg-white rounded-2xl shadow-xl overflow-hidden transition-transform transform hover:scale-105">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover object-center" />
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{product.name}</h3>
                      <p className="text-gray-600 mb-4">{product.description.substring(0, 70)}...</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => { setView('product'); setSelectedProduct(product); }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-300 transition-colors">
                            View
                          </button>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors">
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 col-span-3">No products found. Please add some to the database.</p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased text-gray-800">
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <style>{`
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <button onClick={() => setView('home')} className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors">
            E-Commerce App
          </button>
          <div className="flex items-center space-x-4">
            {token ? (
              <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                Logout
              </button>
            ) : (
              <>
                <button onClick={() => setView('login')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  Login
                </button>
                <button onClick={() => setView('register')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  Register
                </button>
              </>
            )}
            <button onClick={() => setView('cart')} className="relative text-gray-600 hover:text-gray-900 transition-colors">
              <ShoppingCart size={24} />
              {cartState.items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartState.items.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Message and Error Banners */}
      {message && (
        <div className="fixed top-20 right-4 p-4 rounded-lg bg-green-500 text-white shadow-xl animate-fade-in-down transition-opacity">
          {message}
        </div>
      )}

      <main className="py-12">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
