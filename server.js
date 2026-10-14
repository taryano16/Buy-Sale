const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PORT = process.env.PORT || 3000;
const DEFAULT_DATA_FILE = process.env.LISTINGS_FILE
  ? path.resolve(process.env.LISTINGS_FILE)
  : path.join(__dirname, 'data', 'listings.json');
const CATEGORIES = ['Furniture', 'Electronics', 'Home & Living', 'Fashion', 'Sports', 'Other'];

function createApp(dataFile = DEFAULT_DATA_FILE) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  async function readListings() {
    try {
      return JSON.parse(await fs.readFile(dataFile, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async function writeListings(listings) {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, `${JSON.stringify(listings, null, 2)}\n`);
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/listings', async (req, res, next) => {
    try {
      const query = String(req.query.q || '').trim().toLowerCase();
      const category = String(req.query.category || '').trim();
      const sort = String(req.query.sort || 'newest');
      let listings = await readListings();

      if (query) {
        listings = listings.filter((listing) =>
          `${listing.title} ${listing.description} ${listing.category} ${listing.location}`.toLowerCase().includes(query)
        );
      }
      if (category && category !== 'All items') {
        listings = listings.filter((listing) => listing.category === category);
      }
      if (sort === 'price-low') listings.sort((a, b) => a.price - b.price);
      else if (sort === 'price-high') listings.sort((a, b) => b.price - a.price);
      else listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({ listings, total: listings.length });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/listings/:id', async (req, res, next) => {
    try {
      const listing = (await readListings()).find((item) => item.id === req.params.id);
      if (!listing) return res.status(404).json({ error: 'Listing not found.' });
      res.json({ listing });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/listings', async (req, res, next) => {
    try {
      const { title, price, category, description, location, image } = req.body || {};
      const errors = {};

      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 80) {
        errors.title = 'Add a title between 3 and 80 characters.';
      }
      if (price === '' || price === null || price === undefined || !Number.isFinite(Number(price)) || Number(price) <= 0) {
        errors.price = 'Enter a price greater than zero.';
      }
      if (!CATEGORIES.includes(category)) errors.category = 'Choose a valid category.';
      if (typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 1000) {
        errors.description = 'Add a description between 10 and 1,000 characters.';
      }
      if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 60) {
        errors.location = 'Add a location between 2 and 60 characters.';
      }
      if (image && (typeof image !== 'string' || !/^https?:\/\//i.test(image))) {
        errors.image = 'Image must be a valid http or https URL.';
      }
      if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the listing details.', fields: errors });

      const listing = {
        id: randomUUID(),
        title: title.trim(),
        price: Number(price),
        category,
        description: description.trim(),
        location: location.trim(),
        image: image ? image.trim() : '',
        createdAt: new Date().toISOString()
      };
      const listings = await readListings();
      listings.unshift(listing);
      await writeListings(listings);
      res.status(201).json({ listing });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(path.join(__dirname, 'public')));
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}

if (require.main === module) {
  createApp().listen(PORT, () => {
    console.log(`Second Story is running at http://localhost:${PORT}`);
  });
}

module.exports = { createApp };