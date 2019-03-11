const getValues = (obj, selector) => {
    const keys = Object.keys(obj);

    return keys.map(key => {
        return selector(obj[key]);
    });
}

const isType = (obj, type) => {
    return Object.prototype.toString.call(obj) === type;
}

const iteratorWithTimes = (times, iterator) => {
    let i = 0;
    while(i < times) {
        iterator(i);
        i++;
    }
}

module.exports = {
    getValues,
    isType,
    iteratorWithTimes
}