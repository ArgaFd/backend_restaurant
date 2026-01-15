let seq = 1;
const items = [
  {
    id: seq++,
    name: 'Nasi Goreng',
    price: 25000,
    category: 'Main',
    description: 'Nasi goreng spesial',
    image_url: '',
    is_available: true,
  },
];

const getAll = () => items;
const getById = (id) => items.find((i) => i.id === Number(id));

const create = (data) => {
  const item = {
    id: seq++,
    name: String(data.name),
    price: Number(data.price),
    category: String(data.category),
    description: data.description ? String(data.description) : '',
    image_url: data.image_url ? String(data.image_url) : '',
    is_available: data.is_available !== undefined ? Boolean(data.is_available) : true,
  };

  items.push(item);
  return item;
};

const update = (id, data) => {
  const item = getById(id);
  if (!item) return null;

  if (data.name !== undefined) item.name = String(data.name);
  if (data.price !== undefined) item.price = Number(data.price);
  if (data.category !== undefined) item.category = String(data.category);
  if (data.description !== undefined) item.description = String(data.description);
  if (data.image_url !== undefined) item.image_url = String(data.image_url);
  if (data.is_available !== undefined) item.is_available = Boolean(data.is_available);

  return item;
};

const remove = (id) => {
  const idx = items.findIndex((i) => i.id === Number(id));
  if (idx === -1) return false;
  items.splice(idx, 1);
  return true;
};

const getCategories = () => Array.from(new Set(items.map((i) => i.category)));

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getCategories,
};
