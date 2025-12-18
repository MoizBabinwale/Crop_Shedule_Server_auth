const express = require("express");

const Product = require("../models/Product");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, pricePerAcre, category, rate, bottlePerml } = req.body;

    // Validate product name
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Product name is required" });
    }
    // if (!instruction || instruction.trim() === "") {
    //   return res.status(400).json({ error: "Product instruction is required" });
    // }

    // Validate price
    if (pricePerAcre === undefined || pricePerAcre === null || isNaN(pricePerAcre)) {
      return res.status(400).json({ error: "Price per acre is required and must be a number" });
    }

    if (pricePerAcre < 0) {
      return res.status(400).json({ error: "Price per acre cannot be negative" });
    }

    // Save to DB
    const newProduct = new Product({
      name: name.trim(),
      pricePerAcre: Number(pricePerAcre), // store as number
      // instruction: instruction.trim(),
      category,
      rate,
      bottlePerml,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Error adding product" });
  }
});

// Get All Products (no crop relation)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
});

// Update Product
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error updating product" });
  }
});

// Delete Product
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

module.exports = router;
