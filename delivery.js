// delivery.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Store delivery logs
let deliveries = [];

// Receive delivery request
app.post('/deliveries', (req, res) => {
    const { store, product, quantity } = req.body;

    const delivery = {
        id: Date.now(),
        store,
        product,
        quantity,
        status: 'DELIVERED',
        deliveredAt: new Date().toISOString()
    };

    deliveries.push(delivery);
    console.log(`Delivery completed: ${quantity} of ${product} to ${store}`);

    res.json({ message: 'Delivery logged', delivery });
});

// Get all deliveries
app.get('/deliveries', (req, res) => {
    res.json(deliveries);
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Delivery service running on http://localhost:${PORT}`);
});
