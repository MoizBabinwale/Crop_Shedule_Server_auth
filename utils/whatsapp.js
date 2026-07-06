const axios = require("axios");

const formatDateTime = (value) => {
  if (!value) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleString();
  }
};

const formatDateOnly = (value) => {
  if (!value) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleDateString();
  }
};

const normalizeWhatsAppNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("91") && digits.length >= 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const getWeekSummary = (quotation, weekNumber) => {
  const weeks = Array.isArray(quotation?.weeks) ? quotation.weeks : [];
  if (weeks.length === 0) return null;

  if (weekNumber !== undefined && weekNumber !== null && weekNumber !== "") {
    const parsedWeekNumber = Number(weekNumber);
    const matched = weeks.find((week) => Number(week.weekNumber) === parsedWeekNumber);
    if (matched) return matched;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureWeek = weeks.filter((week) => week?.date && new Date(week.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  return futureWeek || weeks[0];
};

function parseQtyString(qty = "") {
  const text = String(qty).toLowerCase();

  const lMatch = text.match(/(\d+(\.\d+)?)\s*(l|ltr|liter|लीटर)/i);
  const mlMatch = text.match(/(\d+(\.\d+)?)\s*(ml|मिली|मिलि)/i);

  return {
    l: lMatch ? Number(lMatch[1]) : 0,
    ml: mlMatch ? Number(mlMatch[1]) : 0,
  };
}

const formatWaterAmount = (value) => parseFloat(Number(value).toFixed(2));
const detectHindiExtraInstruction = (instruction = "") => {
  const text = instruction.toLowerCase();

  if (text.includes("ड्रेंचिंग") || text.includes("drenching")) {
    return "पानी में मिलाकर ड्रिप या ड्रेंचिंग के माध्यम से देना है।";
  }

  if (text.includes("स्प्रे") || text.includes("spray") || text.includes("ड्रिप") || text.includes("drip")) {
    return "पानी में मिलाकर स्प्रे या ड्रिप के माध्यम से देना है।";
  }

  return "तैयार मिश्रण को अनुशंसित विधि के अनुसार दें।";
};
const buildWhatsappInstruction = (week) => {
  if (!week) return "No instructions listed";

  const products = Object.values(week.products || {}).filter((p) => p.category !== "खेत पर पत्तों से धुवा");

  const productText = products
    .map((p) => {
      const { ml, l } = parseQtyString(p.quantity);

      if (l) return `${p.name} ${l} लीटर`;
      if (ml) return `${p.name} ${ml} ml`;

      return p.name;
    })
    .join(" और ");

  const waterAmount = (week.waterPerAcre || 0) * (week.totalAcres || 1);

  const water = waterAmount < 0.5 ? `${(waterAmount * 1000).toFixed(0)} ml` : `${waterAmount.toFixed(2)} लीटर`;

  const extraLine = detectHindiExtraInstruction(week.instructions);

  return `${productText} ${water} पानी में मिलाकर घोल तैयार करें। ${extraLine}${week.totalWater ? ` — कुल ${formatWaterAmount(week.totalWater)} लीटर पानी लगेगा` : ""}`;
};

const buildWhatsappMessage = (quotation, weekNumber) => {
  const farmerName = quotation?.farmerInfo?.name || "Farmer";
  const cropName = quotation?.cropName || "your crop";
  const week = getWeekSummary(quotation, weekNumber);

  const uniqueProductNames = Array.from(new Set((week?.products || []).map((product) => product?.name).filter(Boolean)));

  const productLine = uniqueProductNames.length ? uniqueProductNames.join(", ") : "No products listed";
  const instructionLine = buildWhatsappInstruction(week);
  const weekLabel = week ? `Week ${week.weekNumber}${week.date ? ` (${formatDateOnly(week.date)})` : ""}` : "Quotation summary";

  return [
    `Hello ${farmerName},`,
    `Your ${cropName} crop schedule reminder is here.`,
    `Quotation created on: ${formatDateTime(quotation?.createdAt)}`,
    `${weekLabel}:`,
    `Products: ${productLine}`,
    `Instructions: ${instructionLine}`,
    "",
    "Please contact us if you want any changes in the plan.",
  ].join("\n");
};

const buildWhatsappFallbackUrl = (number, message) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encodedMessage}`;
};

const getWhatsAppApiUrl = () => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v19.0";
  return `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
};

const isWhatsAppConfigured = () => Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const sendWhatsAppTextMessage = async (whatsappNumber, message) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const response = await axios.post(
    getWhatsAppApiUrl(),
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: whatsappNumber,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

const sendWhatsAppTemplateMessage = async (whatsappNumber, templateName, languageCode, bodyParameters) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const response = await axios.post(
    getWhatsAppApiUrl(),
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: whatsappNumber,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: bodyParameters.map((text) => ({ type: "text", text: String(text) })),
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

const sendQuotationWhatsAppAlert = async (quotation, weekNumber) => {
  console.log("[sendQuotationWhatsAppAlert] Starting...");

  if (!quotation) {
    throw new Error("Quotation object is required");
  }

  const rawNumber = quotation?.farmerInfo?.number;
  console.log("[sendQuotationWhatsAppAlert] Raw phone number:", rawNumber);

  const whatsappNumber = normalizeWhatsAppNumber(rawNumber);
  console.log("[sendQuotationWhatsAppAlert] Normalized phone number:", whatsappNumber);

  if (!whatsappNumber) {
    throw new Error("Farmer mobile number is missing or invalid. Please ensure the farmer has a valid 10-digit phone number.");
  }

  try {
    const message = buildWhatsappMessage(quotation, weekNumber);
    console.log("[sendQuotationWhatsAppAlert] Message built successfully");

    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "hi";

    if (isWhatsAppConfigured()) {
      console.log("[sendQuotationWhatsAppAlert] WhatsApp API is configured, sending via API...");
      let providerResponse;

      if (templateName) {
        console.log("[sendQuotationWhatsAppAlert] Using template:", templateName);
        const week = getWeekSummary(quotation, weekNumber);
        const uniqueProductNames = Array.from(new Set((week?.products || []).map((product) => product?.name).filter(Boolean)));
        providerResponse = await sendWhatsAppTemplateMessage(whatsappNumber, templateName, templateLanguage, [
          quotation?.farmerInfo?.name || "Farmer",
          quotation?.cropName || "your crop",
          week ? `Week ${week.weekNumber}` : "Schedule",
          uniqueProductNames.join(", ") || "No products listed",
          week?.instructions || "No instructions listed",
        ]);
      } else {
        console.log("[sendQuotationWhatsAppAlert] Using text message");
        providerResponse = await sendWhatsAppTextMessage(whatsappNumber, message);
      }

      console.log("[sendQuotationWhatsAppAlert] API response received");
      return {
        message: "✅ WhatsApp alert sent successfully!",
        mode: "sent",
        whatsappNumber,
        providerResponse,
      };
    } else {
      console.log("[sendQuotationWhatsAppAlert] WhatsApp API not configured, generating fallback URL...");
      return {
        message: "WhatsApp link generated (open in WhatsApp app)",
        mode: "preview",
        whatsappNumber,
        whatsappUrl: buildWhatsappFallbackUrl(whatsappNumber, message),
        previewMessage: message,
      };
    }
  } catch (error) {
    console.error("[sendQuotationWhatsAppAlert] Error in message building or sending:", error.message);

    // If API send fails, still return the fallback URL
    if (!isWhatsAppConfigured() || error.message.includes("API")) {
      console.log("[sendQuotationWhatsAppAlert] Fallback to WhatsApp link generation");
      try {
        const message = buildWhatsappMessage(quotation, weekNumber);
        return {
          message: "WhatsApp link generated (API error - use fallback link)",
          mode: "preview",
          whatsappNumber,
          whatsappUrl: buildWhatsappFallbackUrl(whatsappNumber, message),
          previewMessage: message,
        };
      } catch (fallbackErr) {
        console.error("[sendQuotationWhatsAppAlert] Fallback generation also failed:", fallbackErr.message);
        throw new Error(`Failed to prepare WhatsApp message: ${fallbackErr.message}`);
      }
    }

    throw error;
  }
};

const getISTDayBounds = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayKey = formatter.format(new Date());
  const start = new Date(`${todayKey}T00:00:00+05:30`);
  const end = new Date(`${todayKey}T23:59:59.999+05:30`);
  return { start, end, todayKey };
};

module.exports = {
  buildWhatsappFallbackUrl,
  buildWhatsappMessage,
  formatDateOnly,
  formatDateTime,
  getISTDayBounds,
  getWeekSummary,
  isWhatsAppConfigured,
  normalizeWhatsAppNumber,
  sendQuotationWhatsAppAlert,
};
