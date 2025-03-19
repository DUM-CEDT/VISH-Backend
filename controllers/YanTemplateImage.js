const YanTemplateImage = require("../models/YanTemplateImage");

// @desc    Create a new YanTemplateImage
// @route   POST /api/yan/image
// @access  Admin
exports.createYanImage = async (req, res, next) => {
  try {
    const { category, level, image, setid } = req.body;

    const yanImage = new YanTemplateImage({
      yan_category: category,
      yan_level: level,
      yan_image_base64: image,
      yan_template_image_set_id: setid,
    });

    const createdYanImage = await yanImage.save();

    res.status(201).json({
      success: true,
      msg: "create yan image successfully",
      data: createdYanImage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: error.message,
    });
  }
};

// @desc    Update a YanTemplateImage
// @route   PUT /api/yan/image/:id
// @access  Admin
exports.updateYanImage = async (req, res, next) => {
  try {
    const { category, level, image, setid } = req.body;

    const yanImage = await YanTemplateImage.findById(req.params.id);

    if (!yanImage) {
      return res.status(404).json({
        success: false,
        msg: "Yan Image not found",
      });
    }

    if (category) {
      yanImage.yan_category = category;
    }

    if (level) {
      yanImage.yan_level = level;
    }

    if (image) {
      yanImage.yan_image_base64 = image;
    }

    if (setid) {
      yanImage.yan_template_image_set_id = setid;
    }

    const updatedYanImage = await yanImage.save();

    res.status(200).json({
      success: true,
      msg: "update yan image successfully",
      data: updatedYanImage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: error.message,
    });
  }
};

// @desc    Get all YanTemplateImage grouped by yan_level
// @route   GET /api/yan/image
// @access  Public
exports.getYanImages = async (req, res, next) => {
    try {
      const levels = [0, 1, 2, 3]; // Define the yan_levels to query
      const result = {};
  
      // Define sort option for yan_template_image_set_id in ascending order
      const sortOption = { yan_template_image_set_id: 1 }; // 1 for ascending
  
      // Fetch all images per yan_level
      for (const level of levels) {
        const levelQuery = { yan_level: level }; // Query by yan_level
        const yanImages = await YanTemplateImage.aggregate(
          [
            {
              $match:
                /**
                 * query: The query in MQL.
                 */
                {
                  yan_level: level
                }
            },
            {
              $sort:
                /**
                 * Provide any number of field/order pairs.
                 */
                {
                  yan_template_image_set_id: 1
                }
            },
            {
              $lookup:
                /**
                 * from: The target collection.
                 * localField: The local join field.
                 * foreignField: The target join field.
                 * as: The name for the results.
                 * pipeline: Optional pipeline to run on the foreign collection.
                 * let: Optional variables to use in the pipeline field stages.
                 */
                {
                  from: "yansetnames",
                  localField: "yan_template_image_set_id",
                  foreignField: "yan_template_image_set_id",
                  as: "result"
                }
            },
            {
              $unwind:
                /**
                 * path: Path to the array field.
                 * includeArrayIndex: Optional name for index.
                 * preserveNullAndEmptyArrays: Optional
                 *   toggle to unwind null and empty values.
                 */
                {
                  path: "$result",
                  preserveNullAndEmptyArrays: false
                }
            },
            {
              $set:
                /**
                 * field: The field name
                 * expression: The expression.
                 */
                {
                  yan_set_name: "$result.yan_set_name"
                }
            },
            {
              $unset:
                /**
                 * Provide the field name to exclude.
                 * To exclude multiple fields, pass the field names in an array.
                 */
                "result"
            },
            {
              $lookup:
                /**
                 * from: The target collection.
                 * localField: The local join field.
                 * foreignField: The target join field.
                 * as: The name for the results.
                 * pipeline: Optional pipeline to run on the foreign collection.
                 * let: Optional variables to use in the pipeline field stages.
                 */
                {
                  from: "categories",
                  localField: "yan_category",
                  foreignField: "_id",
                  as: "result"
                }
            },
            {
              $unwind:
                /**
                 * path: Path to the array field.
                 * includeArrayIndex: Optional name for index.
                 * preserveNullAndEmptyArrays: Optional
                 *   toggle to unwind null and empty values.
                 */
                {
                  path: "$result",
                  preserveNullAndEmptyArrays: false
                }
            },
            {
              $set:
                /**
                 * field: The field name
                 * expression: The expression.
                 */
                {
                  category: "$result.category_name"
                }
            },
            {
              $unset:
                /**
                 * Provide the field name to exclude.
                 * To exclude multiple fields, pass the field names in an array.
                 */
                "result"
            }
          ]
        );
        result[level] = yanImages;
      }
  
      res.status(200).json({
        success: true,
        msg: "Fetched Yan images successfully",
        data: result, // Return object with yan_level as key and array of images as value
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        msg: error.message,
      });
    }
  };

// @desc    Get a single YanTemplateImage
// @route   GET /api/yan/image/:id
// @access  Public
exports.getYanImage = async (req, res, next) => {
  try {
    const yanImage = await YanTemplateImage.findById(req.params.id);

    if (!yanImage) {
      return res.status(404).json({
        success: false,
        msg: "Yan Image not found",
      });
    }

    res.status(200).json({
      success: true,
      msg: "Fetched Yan image successfully",
      data: yanImage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: error.message,
    });
  }
};

// @desc    Delete a YanTemplateImage
// @route   DELETE /api/yan/image/:id
// @access  Admin
exports.deleteYanImage = async (req, res, next) => {
  try {
    const yanImage = await YanTemplateImage.findById(req.params.id);

    if (!yanImage) {
      return res.status(404).json({
        success: false,
        msg: "Yan Image not found",
      });
    }

    await yanImage.deleteOne();

    res.status(200).json({
      success: true,
      msg: "Yan Image deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: error.message,
    });
  }
};
