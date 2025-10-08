const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory storage
let stockData = [];

// Receive stock data from sensors
app.post('/stock', (req, res) => {
    const data = req.body;
    console.log('Received stock data:', data);
    
    // Store the data (replace if same store/product exists)
    stockData = stockData.filter(item => 
        !(item.store === data.store && item.productId === data.productId)
    );
    stockData.push({
        ...data,
        receivedAt: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Stock data saved' });
});

// Get all stock data
app.get('/stock', (req, res) => {
    res.json(stockData);
});

// Get stock for specific store
app.get('/stock/:store', (req, res) => {
    const store = req.params.store;
    const storeData = stockData.filter(item => item.store === store);
    res.json(storeData);
});

// Get low stock items
app.get('/low-stock', (req, res) => {
    const lowStock = stockData.filter(item => item.status === 'LOW');
    res.json(lowStock);
});

app.get('/', (req, res) => {
    res.send(`
        <h1>Stock Management Dashboard</h1>
        <h2>All Stock</h2>
        <div id="all-stock"></div>
        <h2>Low Stock Alerts</h2>
        <div id="low-stock"></div>
        
        <script>
            async function loadData() {
                // Load all stock
                const stockResponse = await fetch('/stock');
                const stockData = await stockResponse.json();
                document.getElementById('all-stock').innerHTML = stockData.map(item => 
                    '<div style="border:1px solid #ccc; margin:5px; padding:10px; background:' + 
                    (item.status === 'LOW' ? '#ffcccc' : '#ccffcc') + '">' +
                    '<strong>' + item.store + ': ' + item.product + '</strong><br>' +
                    'Stock: ' + item.currentStock + ' (Min: ' + item.minimumStock + ')<br>' +
                    'Status: ' + item.status +
                    '</div>'
                ).join('');
                
                // Load low stock
                const lowResponse = await fetch('/low-stock');
                const lowData = await lowResponse.json();
                document.getElementById('low-stock').innerHTML = lowData.length === 0 ? 
                    'No low stock items' : 
                    lowData.map(item => 
                        '<div style="border:1px solid red; margin:5px; padding:10px; background:#ffcccc">' +
                        '<strong>ALERT: ' + item.store + ': ' + item.product + '</strong><br>' +
                        'Only ' + item.currentStock + ' left! (Min: ' + item.minimumStock + ')' +
                        '</div>'
                    ).join('');
            }
            
            loadData();
            setInterval(loadData, 3000); // Refresh every 3 seconds
        </script>
    `);
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Stock API running on http://localhost:${PORT}`);
});
