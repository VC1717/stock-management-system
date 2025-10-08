const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Simple alert storage
let alerts = [];

// Send console notification when an alert is created
function sendNotification(alert) {
    console.log('\n' + '='.repeat(50));
    console.log(`${alert.severity} ALERT`);
    console.log(`Store: ${alert.store}`);
    console.log(`Product: ${alert.product}`);
    console.log(`Current Stock: ${alert.currentStock}`);
    console.log(`Minimum Required: ${alert.minimumStock}`);
    console.log(`Time: ${new Date(alert.createdAt).toLocaleString()}`);
    console.log('='.repeat(50) + '\n');
}

// Check stock levels and create alerts
app.post('/check-alerts', async (req, res) => {
    try {
        // Get current stock from main API
        const response = await axios.get('http://localhost:3001/low-stock');
        const lowStockItems = response.data;

        let newAlerts = 0;

        for (let item of lowStockItems) {
            // Check if we already have an alert for this item
            const existingAlert = alerts.find(alert => 
                alert.store === item.store && 
                alert.productId === item.productId && 
                alert.status === 'ACTIVE'
            );

            if (!existingAlert) {
                // Create new alert
                const alert = {
                    id: Date.now() + Math.random(),
                    store: item.store,
                    product: item.product,
                    productId: item.productId,
                    currentStock: item.currentStock,
                    minimumStock: item.minimumStock,
                    severity: item.currentStock === 0 ? 'CRITICAL' : 'WARNING',
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString(),
                    message: `${item.store}: ${item.product} is low (${item.currentStock} left, minimum: ${item.minimumStock})`
                };

                alerts.push(alert);
                newAlerts++;

                // Send console notification
                sendNotification(alert);
            }
        }

        res.json({ 
            message: `Checked alerts, created ${newAlerts} new alerts`,
            newAlerts: newAlerts,
            totalActiveAlerts: alerts.filter(a => a.status === 'ACTIVE').length
        });

    } catch (error) {
        console.error('Error checking alerts:', error.message);
        res.status(500).json({ error: 'Failed to check alerts' });
    }
});

// Get all active alerts
app.get('/alerts', (req, res) => {
    const activeAlerts = alerts.filter(alert => alert.status === 'ACTIVE');
    res.json(activeAlerts);
});

// Get all alerts (including resolved)
app.get('/alerts/all', (req, res) => {
    res.json(alerts);
});

// Resolve an alert
app.post('/alerts/:id/resolve', (req, res) => {
    const alertId = parseFloat(req.params.id);
    const alert = alerts.find(a => a.id === alertId);

    if (alert) {
        alert.status = 'RESOLVED';
        alert.resolvedAt = new Date().toISOString();
        console.log(`Resolved alert: ${alert.message}`);
        res.json({ message: 'Alert resolved', alert });
    } else {
        res.status(404).json({ error: 'Alert not found' });
    }
});

// Simple dashboard
app.get('/', (req, res) => {
    res.send(`
        <h1>Stock Alert Dashboard</h1>
        <div id="alerts"></div>
        <button onclick="checkAlerts()">Check for New Alerts</button>
        <br><br>
        <button onclick="loadAlerts()">Refresh Alerts</button>

        <script>
            async function loadAlerts() {
                const response = await fetch('/alerts');
                const alerts = await response.json();
                const alertsDiv = document.getElementById('alerts');

                if (alerts.length === 0) {
                    alertsDiv.innerHTML = '<p style="color: green;">No active alerts - all stock levels OK!</p>';
                    return;
                }

                alertsDiv.innerHTML = '<h2>Active Alerts (' + alerts.length + ')</h2>' +
                    alerts.map(alert => 
                        '<div style="border: 1px solid ' + (alert.severity === 'CRITICAL' ? 'red' : 'orange') + 
                        '; margin: 10px; padding: 15px; background-color: ' + 
                        (alert.severity === 'CRITICAL' ? '#ffeeee' : '#fff8e1') + '">' +
                        '<h3>' + alert.severity + ' - ' + alert.store + '</h3>' +
                        '<p><strong>' + alert.product + '</strong></p>' +
                        '<p>Current Stock: ' + alert.currentStock + ' (Minimum: ' + alert.minimumStock + ')</p>' +
                        '<p>Created: ' + new Date(alert.createdAt).toLocaleString() + '</p>' +
                        '<button onclick="resolveAlert(' + alert.id + ')">Resolve Alert</button>' +
                        '</div>'
                    ).join('');
            }

            async function checkAlerts() {
                const response = await fetch('/check-alerts', { method: 'POST' });
                const result = await response.json();
                alert('Checked alerts: ' + result.message);
                loadAlerts();
            }

            async function resolveAlert(id) {
                const response = await fetch('/alerts/' + id + '/resolve', { method: 'POST' });
                const result = await response.json();
                alert('Alert resolved!');
                loadAlerts();
            }

            loadAlerts();
            setInterval(loadAlerts, 10000);
        </script>
    `);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Alert service running on http://localhost:${PORT}`);
});

// Auto-check for alerts every 30 seconds
setInterval(async () => {
    try {
        await axios.post('http://localhost:3002/check-alerts');
    } catch (error) {
        console.log('Auto-check skipped - service may be starting up');
    }
}, 30000);
