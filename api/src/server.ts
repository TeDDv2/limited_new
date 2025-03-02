import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from "cors";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'limited',
  password: process.env.DB_PASSWORD || 'post',
  port: parseInt(process.env.DB_PORT || '5432'),
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/monitor-update', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;
    console.log(`Received monitor update: ${event}`);
    
    io.emit('buzzsneakers_update', { event, data });
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error processing monitor update:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

const getProductData = async () => {
  try {
    const productsQuery = await pool.query(
      `SELECT pid, sku, name, price, image, quantity, updated_price 
       FROM products 
       WHERE deleted = FALSE 
       ORDER BY updated_price DESC, pid`
    );
    
    const sizesQuery = await pool.query('SELECT * FROM sizes');
    
    return {
      products: productsQuery.rows,
      sizes: sizesQuery.rows,
    };
  } catch (error) {
    console.error('Error fetching product data:', error);
    throw error;
  }
};

app.get('/products', async (req: Request, res: Response) => {
  try {
    const data = await getProductData();
    res.json(data);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/product/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [productResult, sizesResult] = await Promise.all([
      pool.query('SELECT * FROM products WHERE pid = $1 AND deleted = FALSE', [id]),
      pool.query('SELECT * FROM sizes WHERE pid = $1', [id])
    ]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({
      product: productResult.rows[0],
      sizes: sizesResult.rows
    });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/update-price', async (req: Request, res: Response) => {
  const { pid } = req.body;
  
  if (!pid) {
    return res.status(400).json({ success: false, error: 'Product ID is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE products SET updated_price = FALSE WHERE pid = $1 RETURNING updated_price', 
      [pid]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const updatedData = await getProductData();
    
    io.emit('product_update', updatedData);
    
    res.json({ 
      success: true, 
      updatedPrice: result.rows[0].updated_price,
      message: 'Price update status changed successfully'
    });
  } catch (err) {
    console.error('Error updating price:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/update-size', async (req: Request, res: Response) => {
  const { pid, sizeName } = req.body;
  
  if (!pid || !sizeName) {
    return res.status(400).json({ success: false, error: 'Product ID and size name are required' });
  }

  try {
    const result = await pool.query(
      'UPDATE sizes SET updated_size = FALSE WHERE pid = $1 AND name = $2 RETURNING updated_size', 
      [pid, sizeName]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Size not found' });
    }
    
    const updatedData = await getProductData();
    
    io.emit('product_update', updatedData);
    
    res.json({ 
      success: true, 
      updatedSize: result.rows[0].updated_size,
      message: 'Size update status changed successfully'
    });
  } catch (err) {
    console.error('Error updating size:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  getProductData().then(data => {
    socket.emit('initial_data', data);
  }).catch(err => {
    console.error('Error sending initial data to socket:', err);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3800;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});