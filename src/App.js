import React, { useState, useEffect, useReducer } from 'react';
import axios from 'axios';
import { ShoppingCart, User, PlusCircle, LayoutDashboard, Truck, CheckCheck, Undo2, Ban, History } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
  const [view, setView] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartState, dispatch] = useReducer(cartReducer, initialCartState);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isDeliveryAdmin, setIsDeliveryAdmin] = useState(localStorage.getItem('isDeliveryAdmin') === 'true');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [adminData, setAdminData] = useState(null);
  const [adminOrders, setAdminOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  // Use useEffect to load external scripts dynamically and only once.
  useEffect(() => {
    // Load Razorpay SDK
    const scriptRazorpay = document.createElement('script');
    scriptRazorpay.src = 'https://checkout.razorpay.com/v1/checkout.js';
    scriptRazorpay.async = true;
    document.body.appendChild(scriptRazorpay);

    // Load Dialogflow Messenger script
    const scriptDialogflow = document.createElement('script');
    scriptDialogflow.src = 'https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1';
    scriptDialogflow.async = true;
    document.body.appendChild(scriptDialogflow);

    // Cleanup function to remove scripts on component unmount
    return () => {
      document.body.removeChild(scriptRazorpay);
      document.body.removeChild(scriptDialogflow);
    };
  }, []); // The empty dependency array ensures this effect runs only once

  // Fetch products on component mount or when the view changes to 'home'
  useEffect(() => {
    if (view === 'home') {
      fetchProducts();
    }
  }, [view]);

  // Fetch admin dashboard data
  useEffect(() => {
    if (view === 'admin' && isAdmin) {
      fetchAdminData();
    }
  }, [view, isAdmin]);

  // Fetch admin orders data
  useEffect(() => {
    if ((view === 'admin-orders' || view === 'admin-canceled-orders') && isAdmin) {
      fetchAdminOrders();
    }
  }, [view, isAdmin]);

  // Fetch delivery admin data
  useEffect(() => {
    if (view === 'delivery-admin' && isDeliveryAdmin) {
      fetchDeliveryOrders();
    }
  }, [view, isDeliveryAdmin]);

  // Fetch my orders data
  useEffect(() => {
    if (view === 'my-orders' && token) {
      fetchMyOrders();
    }
  }, [view, token]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
    setMessage(`${product.name} added to cart!`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleAuthSubmit = async (e, type) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = type === 'register' ? 'register' : 'login';
      const response = await axios.post(`${API_BASE_URL}/${endpoint}`, authForm);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', response.data.isAdmin);
      localStorage.setItem('isDeliveryAdmin', response.data.isDeliveryAdmin);
      setToken(response.data.token);
      setIsAdmin(response.data.isAdmin);
      setIsDeliveryAdmin(response.data.isDeliveryAdmin);
      setAuthForm({ name: '', email: '', password: '' });
      setView('home');
    } catch (error) {
      console.error('Auth error:', error.response.data.msg);
      setAuthError(error.response.data.msg);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isDeliveryAdmin');
    setToken(null);
    setIsAdmin(false);
    setIsDeliveryAdmin(false);
    setView('home');
  };

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

      const { data } = await axios.post(`${API_BASE_URL}/orders/pay`, orderData, config);

      const options = {
        key: 'rzp_test_RFO0xjdVNdABgD',
        amount: data.razorpayOrder.amount,
        currency: 'INR',
        name: 'E-commerce App',
        description: 'Order Payment',
        order_id: data.razorpayOrder.id,
        handler: async function (response) {
          dispatch({ type: 'CLEAR_CART' });
          setMessage('Payment successful! Order placed!');
          setTimeout(() => setView('home'), 1500);
        },
        modal: {
          ondismiss: function () {
            setMessage('Payment failed or was canceled.');
            setTimeout(() => setMessage(''), 2000);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Checkout error:', error.response ? error.response.data.msg : error.message);
      setMessage(error.response ? error.response.data.msg : 'Checkout failed. Please try again.');
    }
  };
  
  const fetchAdminData = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const { data } = await axios.get(`${API_BASE_URL}/admin/dashboard`, config);
      setAdminData(data);
    } catch (error) {
      console.error('Error fetching admin data:', error.response ? error.response.data.msg : error.message);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const { data } = await axios.get(`${API_BASE_URL}/admin/orders`, config);
      setAdminOrders(data);
    } catch (error) {
      console.error('Error fetching admin orders:', error.response ? error.response.data.msg : error.message);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const productData = {
      name: e.target.name.value,
      description: e.target.description.value,
      price: parseFloat(e.target.price.value),
      imageUrl: e.target.imageUrl.value,
    };
    try {
      const config = { headers: { 'x-auth-token': token } };
      await axios.post(`${API_BASE_URL}/products`, productData, config);
      setMessage('Product added successfully!');
      setTimeout(() => {
        setMessage('');
        e.target.reset();
        fetchProducts(); // Refresh product list
      }, 1500);
    } catch (error) {
      console.error('Error adding product:', error.response ? error.response.data.msg : error.message);
      setMessage(error.response ? error.response.data.msg : 'Failed to add product.');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const fetchDeliveryOrders = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const { data } = await axios.get(`${API_BASE_URL}/delivery/orders`, config);
      setDeliveryOrders(data);
    } catch (error) {
      console.error('Error fetching delivery orders:', error.response ? error.response.data.msg : error.message);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      await axios.put(`${API_BASE_URL}/delivery/orders/${orderId}/status`, { newStatus }, config);
      setMessage(`Order status updated to "${newStatus}".`);
      fetchDeliveryOrders();
      setTimeout(() => setMessage(''), 1500);
    } catch (error) {
      console.error('Error updating order status:', error.response ? error.response.data.msg : error.message);
      setMessage(error.response ? error.response.data.msg : 'Failed to update order status.');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      const { data } = await axios.get(`${API_BASE_URL}/orders/my-orders`, config);
      setMyOrders(data);
    } catch (error) {
      console.error('Error fetching my orders:', error.response ? error.response.data.msg : error.message);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      await axios.put(`${API_BASE_URL}/orders/${orderId}/cancel`, {}, config);
      setMessage('Order canceled successfully!');
      fetchMyOrders(); // Refresh my orders list
      setTimeout(() => setMessage(''), 1500);
    } catch (error) {
      console.error('Error canceling order:', error.response ? error.response.data.msg : error.message);
      setMessage(error.response ? error.response.data.msg : 'Failed to cancel order.');
      setTimeout(() => setMessage(''), 2000);
    }
  };
  
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
      case 'admin':
        return (
          <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Admin Dashboard</h2>
            {adminData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                  <div className="text-5xl font-bold text-blue-600">{adminData.productCount}</div>
                  <div className="text-lg text-gray-600 mt-2">Total Products</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                  <div className="text-5xl font-bold text-green-600">{adminData.deliveredOrders}</div>
                  <div className="text-lg text-gray-600 mt-2">Delivered Orders</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                  <div className="text-5xl font-bold text-red-600">{adminData.returnedOrders}</div>
                  <div className="text-lg text-gray-600 mt-2">Returned Orders</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                  <div className="text-5xl font-bold text-yellow-600">{adminData.pendingOrders}</div>
                  <div className="text-lg text-gray-600 mt-2">Pending Orders</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                  <div className="text-5xl font-bold text-purple-600">{adminData.processingOrders}</div>
                  <div className="text-lg text-gray-600 mt-2">Processing Orders</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                  <div className="text-5xl font-bold text-gray-800">{adminData.totalOrders}</div>
                  <div className="text-lg text-gray-600 mt-2">Total Orders</div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">Loading dashboard data...</p>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-xl mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Add New Product</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product Name</label>
                        <input type="text" name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product Price</label>
                        <input type="number" name="price" required step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" required rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Image URL</label>
                        <input type="url" name="imageUrl" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors">Add Product</button>
                    </div>
                </form>
            </div>
          </div>
        );
      case 'admin-orders':
        const filteredOrders = adminOrders.filter(order => order.status === 'Canceled');
        const ordersToDisplay = view === 'admin-canceled-orders' ? filteredOrders : adminOrders;

        return (
          <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">All Orders</h2>
            <div className="mb-4 flex justify-center space-x-4">
              <button 
                onClick={() => setView('admin-orders')}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${view === 'admin-orders' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                All Orders
              </button>
              <button 
                onClick={() => setView('admin-canceled-orders')}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${view === 'admin-canceled-orders' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                Canceled Orders
              </button>
            </div>
            {ordersToDisplay.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {ordersToDisplay.map(order => (
                  <div key={order._id} className="bg-white p-6 rounded-2xl shadow-xl">
                    <h3 className="text-xl font-bold mb-2">Order ID: #{order._id}</h3>
                    <p className="text-sm text-gray-500">Customer: {order.user.name} ({order.user.email})</p>
                    <p className="text-gray-600 mt-1">Total: <span className="font-semibold">${order.totalPrice.toFixed(2)}</span></p>
                    <p className={`text-sm font-bold mt-2 ${order.status === 'Delivered' ? 'text-green-600' : order.status === 'Canceled' ? 'text-red-600' : 'text-yellow-600'}`}>Status: {order.status}</p>
                    <div className="mt-4">
                      <h4 className="font-bold mb-2">Items:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {order.items.map((item, index) => (
                          <li key={index} className="text-gray-700">{item.name} x {item.quantity} (${item.price.toFixed(2)} each)</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 mt-8">No orders to display.</p>
            )}
          </div>
        );
      case 'delivery-admin':
        return (
          <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Delivery Admin Panel</h2>
            {deliveryOrders.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {deliveryOrders.map(order => (
                  <div key={order._id} className="bg-white p-6 rounded-2xl shadow-xl">
                    <h3 className="text-xl font-bold mb-2">Order #{order._id.substring(0, 8)}...</h3>
                    <p className="text-gray-600">Total Price: <span className="font-semibold">${order.totalPrice.toFixed(2)}</span></p>
                    <p className={`text-sm font-bold mt-2 ${order.status === 'Delivered' ? 'text-green-600' : 'text-yellow-600'}`}>Status: {order.status}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => handleUpdateStatus(order._id, 'Processing')} className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-full hover:bg-purple-600 transition-colors">
                        Processing
                      </button>
                      <button onClick={() => handleUpdateStatus(order._id, 'Delivered')} className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 transition-colors">
                        Delivered
                      </button>
                      <button onClick={() => handleUpdateStatus(order._id, 'Returned')} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-full hover:bg-red-600 transition-colors">
                        Returned
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No orders to display.</p>
            )}
          </div>
        );
      case 'my-orders':
        return (
          <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">My Orders</h2>
            {myOrders.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {myOrders.map(order => (
                  <div key={order._id} className="bg-white p-6 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-800">Order #{order._id.substring(0, 8)}...</h3>
                        <span className={`px-3 py-1 text-sm font-bold rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-600' : order.status === 'Canceled' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {order.status}
                        </span>
                    </div>
                    <p className="text-gray-600 mt-1">Total: <span className="font-semibold">${order.totalPrice.toFixed(2)}</span></p>
                    <p className="text-sm text-gray-500">Placed on: {new Date(order.createdAt).toLocaleDateString()}</p>
                    <div className="mt-4">
                      <h4 className="font-bold mb-2 text-gray-800">Items:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {order.items.map((item, index) => (
                          <li key={index} className="text-gray-700">{item.name} x {item.quantity} (${item.price.toFixed(2)} each)</li>
                        ))}
                      </ul>
                    </div>
                    {(order.status === 'Processing' || order.status === 'Pending') && (
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => handleCancelOrder(order._id)} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-full hover:bg-red-600 transition-colors">
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 mt-8">You have no orders yet.</p>
            )}
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
            {isAdmin && (
              <button onClick={() => setView('admin')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center gap-1">
                <LayoutDashboard size={20} /> Admin
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setView('admin-orders')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center gap-1">
                <History size={20} /> Orders
              </button>
            )}
            {isDeliveryAdmin && (
              <button onClick={() => setView('delivery-admin')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center gap-1">
                <Truck size={20} /> Delivery
              </button>
            )}
            {token && (
               <button onClick={() => setView('my-orders')} className="text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center gap-1">
                <History size={20} /> My Orders
               </button>
            )}
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
        <div className="fixed top-20 right-4 p-4 rounded-lg bg-green-500 text-white shadow-xl animate-fade-in-down transition-opacity z-50">
          {message}
        </div>
      )}

      <main className="py-12">
        {renderView()}
      </main>

      <df-messenger
        intent="WELCOME"
        chat-title="test"
        agent-id="7dc8b992-8ca0-43d0-9d43-08505b2ad3dc"
        language-code="en"
      ></df-messenger>

    </div>
  );
};

export default App;
