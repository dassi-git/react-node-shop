import { getRelatedProducts, getBundleProducts } from './bundleHelpers';

describe('bundle helpers', () => {
  const products = [
    { _id: 'p1', name: 'Laptop Pro', category: 'Electronics', price: 1200 },
    { _id: 'p2', name: 'Wireless Mouse', category: 'Electronics', price: 40 },
    { _id: 'p3', name: 'Office Chair', category: 'Furniture', price: 180 },
    { _id: 'p4', name: 'Keyboard', category: 'Electronics', price: 90 },
    { _id: 'p5', name: 'USB Hub', category: 'Electronics', price: 45 }
  ];

  it('returns similar products in the same category and excludes the current item', () => {
    const related = getRelatedProducts(products, 'p1');

    expect(related.map((p) => p._id)).toEqual(['p2', 'p4', 'p5']);
  });

  it('builds a bundle offer from matching products', () => {
    const bundles = getBundleProducts(products, 3);

    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles[0].totalPrice).toBeGreaterThan(0);
    expect(bundles[0].items.length).toBeLessThanOrEqual(3);
  });
});
