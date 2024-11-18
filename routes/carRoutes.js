const express = require('express');
const jwt = require('jsonwebtoken');
const Car = require('../models/Car');
const multer = require('multer');

const router = express.Router();

// Middleware to authenticate token
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Multer setup for image upload
const upload = multer({ dest: 'uploads/' });

// Create Car
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  const { title, description, tags } = req.body;
  const images = req.files.map(file => file.path);
  try {
    const car = new Car({ userId: req.user.id, title, description, tags, images });
    await car.save();
    res.status(201).json(car);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List All Cars
router.get('/', auth, async (req, res) => {
  try {
    const cars = await Car.find({ userId: req.user.id });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Car by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car || car.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Car
router.patch('/:id', auth, upload.array('images', 10), async (req, res) => {
  const { title, description, tags } = req.body;
  const images = req.files.map(file => file.path);

  try {
    const car = await Car.findById(req.params.id);
    if (!car || car.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Car not found' });
    }

    if (title) car.title = title;
    if (description) car.description = description;
    if (tags) car.tags = tags;
    if (images.length > 0) car.images = images;

    await car.save();
    res.json(car);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Car
router.delete('/:id', auth, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car || car.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Car not found' });
    }
    await Car.findByIdAndDelete(req.params.id);
    res.json({ message: 'Car deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search Cars
router.get('/search', auth, async (req, res) => {
  const keyword = req.query.keyword;
  try {
    const cars = await Car.find({
      userId: req.user.id,
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
      ],
    });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

