export const hasAllValues = (obj: { [key: string]: any }): boolean => {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (
        obj[key] === "" ||
        obj[key] === null ||
        obj[key] === undefined ||
        obj[key] === false
      ) {
        return false;
      }
    }
  }
  return true;
};
