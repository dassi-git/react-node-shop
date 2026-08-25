export const getRelatedProducts = (products = [], currentProductId, max = 4) => {
  if (!Array.isArray(products) || !currentProductId) return [];

  const current = products.find((product) => product._id === currentProductId || product.id === currentProductId);
  if (!current) return [];

  const currentCategory = current.category || '';

  const related = products.filter((product) => {
    const sameId = product._id === currentProductId || product.id === currentProductId;
    const sameCategory = (product.category || '').toLowerCase() === currentCategory.toLowerCase();
    return !sameId && sameCategory;
  });

  return related.slice(0, max);
};

export const getBundleProducts = (products = [], limit = 3) => {
  if (!Array.isArray(products) || products.length === 0) return [];

  const sorted = [...products].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  const bundleItems = sorted.slice(0, limit);

  const totalPrice = bundleItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return [
    {
      id: 'bundle-best-seller',
      name: 'Bundle deal',
      items: bundleItems,
      totalPrice,
      discount: Math.round((totalPrice * 0.1) * 10) / 10,
      finalPrice: Math.round((totalPrice * 0.9) * 100) / 100
    }
  ];
};
