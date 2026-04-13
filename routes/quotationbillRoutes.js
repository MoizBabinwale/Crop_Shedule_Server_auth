const Quotation = require("../models/Quotation");
const QuotationBill = require("../models/QuotationBill");

const express = require("express");
const ScheduleBill = require("../models/ScheduleBill");
const Schedule = require("../models/Schedule");
const router = express.Router();

const Product = require("../models/Product");

router.post("/:quotationId/:acres", async (req, res) => {
  try {
    const { quotationId, acres } = req.params;

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    /* --------------------------------------------------
       ✅ 1. IF BILL ALREADY EXISTS → RETURN IT
    -------------------------------------------------- */
    if (quotation.quoBillId) {
      const existingBill = await QuotationBill.findById(quotation.quoBillId);

      if (existingBill) {
        return res.status(200).json({
          message: "Quotation bill already exists",
          bill: existingBill,
        });
      }
    }

    /* --------------------------------------------------
       ✅ 2. CREATE NEW BILL
    -------------------------------------------------- */
    const scheduleId = quotation.scheduleId;

    const scheduleData = await Schedule.findById(scheduleId);
    if (!scheduleData) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const scheduleBill = await ScheduleBill.findOne({ scheduleId });
    if (!scheduleBill) {
      return res.status(404).json({ message: "Schedule Bill not found" });
    }

    // 1. Get all product names
    const productNames = [];

    scheduleData.weeks.forEach((week) => {
      week.products.forEach((p) => {
        if (!productNames.includes(p.name)) {
          productNames.push(p.name);
        }
      });
    });

    // 2. Fetch all products in ONE query
    const productsFromDB = await Product.find({
      name: { $in: productNames },
    });

    // 3. Create map
    const productMap = {};
    productsFromDB.forEach((p) => {
      productMap[p.name] = p;
    });

    // 4. Process data
    const productStats = {};

    scheduleData.weeks.forEach((week) => {
      week.products.forEach((product) => {
        const { name, quantity } = product;

        const bottlePerml = productMap[name]?.bottlePerml || 0;

        if (!productStats[name]) {
          productStats[name] = {
            times: 0,
            totalMl: 0,
            ltrKg: 0,
            bottlePerml,
          };
        }

        productStats[name].times += 1;

        const matchMl = quantity?.match(/([\d.]+)\s*ml\/g/i);
        if (matchMl) {
          productStats[name].totalMl += parseFloat(matchMl[1]);
        }

        const matchLtr = quantity?.match(/([\d.]+)\s*(ltr|l)\/kg/i);
        if (matchLtr) {
          productStats[name].ltrKg += parseFloat(matchLtr[1]);
        }
      });
    });

    const multipliedItems = scheduleBill.items.map((item) => {
      const stats = productStats[item.name];

      if (!stats) {
        throw new Error(`Missing product stats for ${item.name}`);
      }

      return {
        name: item.name,
        times: stats.times,
        totalMl: stats.totalMl * acres,
        ltrKg: stats.ltrKg * acres,
        rate: item.rate,
        totalAmt: item.totalAmt * acres,
        bottlePerml: stats.bottlePerml,
      };
    });

    const multiplyCost = (cost = {}) => ({
      totalRs: (cost.totalRs || 0) * acres,
      perAcre: cost.perAcre || 0,
      perHectare: cost.perHectare || 0,
      perBigha: cost.perBigha || 0,
      perGuntha: cost.perGuntha || 0,
    });

    const newQuotationBill = new QuotationBill({
      quotationId: quotation._id,
      scheduleId: scheduleBill.scheduleId,
      cropId: scheduleBill.cropId,
      cropName: scheduleBill.cropName,
      billDate: new Date(),
      acres: Number(acres),
      items: multipliedItems,
      additionalInfo: {
        totalPlants: (scheduleBill.additionalInfo.totalPlants || 0) * acres,
        totalAcres: Number(acres),
        totalGuntha: (scheduleBill.additionalInfo.totalGuntha || 0) * acres,
        totalCost: (scheduleBill.additionalInfo.totalCost || 0) * acres,
        perPlantCost: scheduleBill.additionalInfo.perPlantCost || 0,
        leafProductCost: multiplyCost(scheduleBill.additionalInfo.leafProductCost),
        bioControlCost: multiplyCost(scheduleBill.additionalInfo.bioControlCost),
        fieldInputPrepCost: multiplyCost(scheduleBill.additionalInfo.fieldInputPrepCost),
        smokeCost: multiplyCost(scheduleBill.additionalInfo.smokeCost),
      },
      farmerInfo: quotation.farmerInfo,
    });

    await newQuotationBill.save();

    /* --------------------------------------------------
       ✅ 3. SAVE BILL ID INTO QUOTATION
    -------------------------------------------------- */
    quotation.quoBillId = newQuotationBill._id;
    await quotation.save();

    return res.status(201).json({
      message: "Quotation bill created",
      bill: newQuotationBill,
    });
  } catch (error) {
    console.error("Error creating quotation bill:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const bill = await QuotationBill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ message: "Failed to fetch bill" });
  }
});

module.exports = router;
