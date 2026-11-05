export const checkSafeInt = (value: unknown) => {
  const numVal = Number(value);
  if (!Number.isSafeInteger(numVal) || numVal <= 0) throw new Error();
  return numVal;
};
