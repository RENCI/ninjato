// Interpolate vectors or scalars
export const interpolate = (a, b, t) => {
  const interpolate = (a, b, t) => a + t * (b - a);

  if (a.length && b.length) {
    if (a.length !== b.length) {
      console.warn(`interpolate values have different length: ${ a }, ${ b }`);
    }

    return new Array(Math.min(a.length, b.length)).fill().map((v, i) => interpolate(a[i], b[i], t));
  } 
  else {
    return interpolate(a, b, t);
  }
}

// Distance between two points
export const distance = (a, b) => {
  const n = Math.min(a.length, b.length);

  return Math.sqrt(new Array(n).fill().reduce((sum, v, i) => {
    const c = b[i] - a[i];
    return sum + c * c;
  }, 0));
};