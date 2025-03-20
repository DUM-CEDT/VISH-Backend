const Merchandise = require('../models/Merchandise');

//@desc         getAllMerch
//@route        GET /api/merchandise/items
//@access       Public
exports.getAllMerch = async (req, res) => {
  try {
    const { page = 1, limit = 9, type } = req.query; 
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { name: { $ne: 'allyan' } };
    if (type && ['ยันต์', 'กำไล', 'แหวน', 'สร้อย', 'เบอร์มงคล', 'อื่นๆ'].includes(type)) {
      query.type = type;
    }

    const totalItems = await Merchandise.countDocuments(query);
    const items = await Merchandise.find(query)
      .skip(skip)
      .limit(parsedLimit);

    const totalPages = Math.ceil(totalItems / parsedLimit);
    const lastPage = totalPages > 0 ? totalPages : 1; 

    res.json({
      success: true,
      items,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        last_page: lastPage,
        current_page: parsedPage,
        limit: parsedLimit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//@desc         getOneMerch 
//@route        GET /api/merchandise/items/:id
//@access       Public
exports.getOneMerch = async (req, res) => {
  try {
    const item = await Merchandise.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//@desc         addMerch 
//@route        POST /api/merchandise/items/
//@access       Private only ADMIN
exports.addMerch = async (req, res) => {
  try {
    const { name, price, image, merch_props, description, type } = req.body;
    if (!name || !price || !image || !merch_props || !description || !type) {
      return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    if (!Array.isArray(merch_props)) {
      return res.status(400).json({ success: false, message: 'merch_props must be an array' });
    }
    for (let prop of merch_props) {
      if (!prop.type || !Array.isArray(prop.options) || prop.options.length === 0) {
        return res.status(400).json({ success: false, message: 'Each merch_prop must have a type and non-empty options array' });
      }
    }

    const validTypes = ['ยันต์', 'กำไล', 'แหวน', 'สร้อย', 'เบอร์มงคล', 'อื่นๆ'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid merchandise type' });
    }

    const merchandise = await Merchandise.create({ name, price, image, merch_props, description, type });
    res.status(201).json({ success: true, item: merchandise });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//@desc         updateMerch 
//@route        PUT /api/merchandise/items/:id
//@access       Private only ADMIN
exports.updateMerch = async (req, res) => {
  try {
    const { name, price, image, merch_props, description, type } = req.body;
    if (!name && !price && !image && !merch_props && !description && !type) {
      return res.status(400).json({ success: false, message: 'At least one field is required for update' });
    }

    if (merch_props) {
      if (!Array.isArray(merch_props)) {
        return res.status(400).json({ success: false, message: 'merch_props must be an array' });
      }
      for (let prop of merch_props) {
        if (!prop.type || !Array.isArray(prop.options) || prop.options.length === 0) {
          return res.status(400).json({ success: false, message: 'Each merch_prop must have a type and non-empty options array' });
        }
      }
    }

    const updateData = { name, price, image, merch_props, description };
    if (type) {
      const validTypes = ['ยันต์', 'กำไล', 'แหวน', 'สร้อย', 'เบอร์มงคล', 'อื่นๆ'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid merchandise type' });
      }
      updateData.type = type;
    }

    const merchandise = await Merchandise.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!merchandise) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item: merchandise });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//@desc         deleteMerch
//@route        DELETE /api/merchandise/items/:id
//@access       Private only ADMIN
exports.deleteMerch = async (req, res) => {
  try {
    const item = await Merchandise.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};