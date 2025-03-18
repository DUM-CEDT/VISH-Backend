const getThaiTime = (date = new Date()) => {
    const thaiTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return thaiTime;
};

module.exports = { getThaiTime };