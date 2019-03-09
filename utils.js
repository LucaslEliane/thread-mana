const getValues = (obj, selector) => {
    const keys = Object.keys(obj);

    return keys.map(key => {
        return selector(obj[key]);
    });
}

module.exports = {
    getValues,
}