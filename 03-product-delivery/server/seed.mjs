import bcrypt from 'bcryptjs';
import { initDb, closeDb } from './database.mjs';

const BCRYPT_ROUNDS = 12;

function seed() {
  const db = initDb();

  console.log('Seeding database...');

  // Clear existing data (order matters due to foreign keys)
  db.exec(`
    DELETE FROM payments;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM cart_items;
    DELETE FROM carts;
    DELETE FROM favorites;
    DELETE FROM menu_items;
    DELETE FROM addresses;
    DELETE FROM users;
    DELETE FROM restaurants;
    DELETE FROM categories;
    DELETE FROM coupons;
  `);

  // --- Categories ---
  const categoryStmt = db.prepare(`
    INSERT INTO categories (id, name, emoji, sort_order) VALUES (?, ?, ?, ?)
  `);

  const categories = [
    { id: 'cat_all', name: 'Todos', emoji: '🍽️', sort_order: 0 },
    { id: 'cat_hamburger', name: 'Hambúrguer', emoji: '🍔', sort_order: 1 },
    { id: 'cat_japones', name: 'Japonês', emoji: '🍣', sort_order: 2 },
    { id: 'cat_pizza', name: 'Pizza', emoji: '🍕', sort_order: 3 },
    { id: 'cat_saudavel', name: 'Saudável', emoji: '🥗', sort_order: 4 },
    { id: 'cat_massas', name: 'Massas', emoji: '🍝', sort_order: 5 },
    { id: 'cat_brasileira', name: 'Brasileira', emoji: '🥩', sort_order: 6 },
  ];

  for (const cat of categories) {
    categoryStmt.run(cat.id, cat.name, cat.emoji, cat.sort_order);
  }
  console.log(`  -> ${categories.length} categories seeded`);

  // --- Restaurants ---
  const restaurantStmt = db.prepare(`
    INSERT INTO restaurants (id, name, slug, cuisine, subtitle, category_id, rating, review_count,
      eta_min, eta_max, delivery_fee, min_order, cover_gradient, hero_emoji, promo_text, note, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const restaurants = [
    {
      id: 'rest_pasta', name: 'Pasta & Fogo', slug: 'pasta-e-fogo', cuisine: 'Italiana',
      subtitle: 'Massas artesanais com molhos da casa', category_id: 'cat_massas',
      rating: 4.8, review_count: 324, eta_min: 25, eta_max: 40, delivery_fee: 5.99, min_order: 30,
      cover_gradient: 'linear-gradient(135deg, #e44d26, #f7b731)', hero_emoji: '🍝',
      promo_text: '20% OFF no primeiro pedido', note: 'Forno a lenha desde 1998',
      tags: '["Promoção", "Top 10", "Forno a Lenha"]',
    },
    {
      id: 'rest_sushi', name: 'Sushi Wave', slug: 'sushi-wave', cuisine: 'Japonesa',
      subtitle: 'Sushi premium com peixe fresco do dia', category_id: 'cat_japones',
      rating: 4.9, review_count: 512, eta_min: 30, eta_max: 50, delivery_fee: 7.99, min_order: 50,
      cover_gradient: 'linear-gradient(135deg, #0c3483, #a2b6df)', hero_emoji: '🍣',
      promo_text: 'Combo especial por R$ 89,90', note: 'Peixe fresco importado',
      tags: '["Premium", "Peixe Fresco", "Destaque"]',
    },
    {
      id: 'rest_burger', name: 'Burger Lab', slug: 'burger-lab', cuisine: 'Hambúrguer',
      subtitle: 'Smash burgers e milkshakes artesanais', category_id: 'cat_hamburger',
      rating: 4.7, review_count: 891, eta_min: 15, eta_max: 30, delivery_fee: 4.99, min_order: 25,
      cover_gradient: 'linear-gradient(135deg, #f7b731, #fc5c65)', hero_emoji: '🍔',
      promo_text: 'Combo duplo por R$ 39,90', note: 'Blend exclusivo 180g',
      tags: '["Best Seller", "Rápido", "Combos"]',
    },
    {
      id: 'rest_green', name: 'Green Bowl Co.', slug: 'green-bowl-co', cuisine: 'Saudável',
      subtitle: 'Bowls, saladas e sucos naturais', category_id: 'cat_saudavel',
      rating: 4.6, review_count: 203, eta_min: 20, eta_max: 35, delivery_fee: 3.99, min_order: 20,
      cover_gradient: 'linear-gradient(135deg, #38ada9, #78e08f)', hero_emoji: '🥗',
      promo_text: 'Frete grátis acima de R$ 60', note: 'Ingredientes orgânicos',
      tags: '["Orgânico", "Fitness", "Vegano"]',
    },
    {
      id: 'rest_pizza', name: 'Pizza Club 24h', slug: 'pizza-club-24h', cuisine: 'Pizza',
      subtitle: 'Pizzas napoletanas 24 horas por dia', category_id: 'cat_pizza',
      rating: 4.5, review_count: 1247, eta_min: 20, eta_max: 40, delivery_fee: 5.99, min_order: 35,
      cover_gradient: 'linear-gradient(135deg, #e55039, #f8c291)', hero_emoji: '🍕',
      promo_text: '2 pizzas por R$ 59,90', note: 'Aberto 24 horas',
      tags: '["24h", "Promoção", "Napoletana"]',
    },
    {
      id: 'rest_brasa', name: 'Brasa & Lenha', slug: 'brasa-e-lenha', cuisine: 'Brasileira',
      subtitle: 'Churrasco premium e acompanhamentos', category_id: 'cat_brasileira',
      rating: 4.8, review_count: 678, eta_min: 30, eta_max: 50, delivery_fee: 8.99, min_order: 45,
      cover_gradient: 'linear-gradient(135deg, #6a3093, #a044ff)', hero_emoji: '🥩',
      promo_text: 'Picanha 500g por R$ 69,90', note: 'Cortes nobres selecionados',
      tags: '["Premium", "Churrasco", "Cortes Nobres"]',
    },
  ];

  for (const r of restaurants) {
    restaurantStmt.run(
      r.id, r.name, r.slug, r.cuisine, r.subtitle, r.category_id,
      r.rating, r.review_count, r.eta_min, r.eta_max, r.delivery_fee, r.min_order,
      r.cover_gradient, r.hero_emoji, r.promo_text, r.note, r.tags
    );
  }
  console.log(`  -> ${restaurants.length} restaurants seeded`);

  // --- Menu Items ---
  const menuStmt = db.prepare(`
    INSERT INTO menu_items (restaurant_id, name, description, price, emoji, badge, category, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const menuItems = [
    // Pasta & Fogo
    { rid: 'rest_pasta', name: 'Fettuccine Alfredo', desc: 'Massa fresca com molho cremoso de parmesão', price: 42.90, emoji: '🍝', badge: 'Best Seller', cat: 'Massas', sort: 1 },
    { rid: 'rest_pasta', name: 'Lasanha Bolonhesa', desc: 'Camadas de massa, ragù bolognese e bechamel', price: 48.90, emoji: '🍝', badge: null, cat: 'Massas', sort: 2 },
    { rid: 'rest_pasta', name: 'Ravioli de Trufa', desc: 'Ravioli recheado com ricota e trufa negra', price: 56.90, emoji: '🍝', badge: 'Novo', cat: 'Massas', sort: 3 },
    { rid: 'rest_pasta', name: 'Penne ao Pesto', desc: 'Penne al dente com pesto genovês e pinoli', price: 38.90, emoji: '🍝', badge: null, cat: 'Massas', sort: 4 },
    { rid: 'rest_pasta', name: 'Tiramisu', desc: 'Clássico italiano com mascarpone e café', price: 24.90, emoji: '🍰', badge: null, cat: 'Sobremesas', sort: 5 },
    { rid: 'rest_pasta', name: 'Bruschetta Caprese', desc: 'Pão italiano com tomate, mozzarella e manjericão', price: 22.90, emoji: '🥖', badge: null, cat: 'Entradas', sort: 6 },

    // Sushi Wave
    { rid: 'rest_sushi', name: 'Combo Premium 30 peças', desc: 'Salmão, atum, camarão e filadélfia', price: 89.90, emoji: '🍣', badge: 'Best Seller', cat: 'Combos', sort: 1 },
    { rid: 'rest_sushi', name: 'Temaki Salmão', desc: 'Cone de nori com salmão fresco e cream cheese', price: 28.90, emoji: '🍣', badge: null, cat: 'Temakis', sort: 2 },
    { rid: 'rest_sushi', name: 'Sashimi de Atum', desc: '10 fatias de atum bluefin fresco', price: 54.90, emoji: '🐟', badge: 'Premium', cat: 'Sashimis', sort: 3 },
    { rid: 'rest_sushi', name: 'Hot Roll Crunchy', desc: 'Roll empanado com salmão e cream cheese', price: 32.90, emoji: '🍣', badge: null, cat: 'Hot Rolls', sort: 4 },
    { rid: 'rest_sushi', name: 'Uramaki Skin', desc: 'Roll com skin de salmão crocante', price: 26.90, emoji: '🍣', badge: null, cat: 'Uramakis', sort: 5 },
    { rid: 'rest_sushi', name: 'Missoshiru', desc: 'Sopa tradicional japonesa com tofu e cebolinha', price: 16.90, emoji: '🍜', badge: null, cat: 'Sopas', sort: 6 },
    { rid: 'rest_sushi', name: 'Gyoza de Camarão', desc: '6 unidades grelhadas na chapa', price: 34.90, emoji: '🥟', badge: 'Novo', cat: 'Entradas', sort: 7 },
    { rid: 'rest_sushi', name: 'Mochi de Matcha', desc: 'Bolinho japonês recheado com sorvete de matcha', price: 18.90, emoji: '🍡', badge: null, cat: 'Sobremesas', sort: 8 },

    // Burger Lab
    { rid: 'rest_burger', name: 'Smash Burger Clássico', desc: 'Blend 180g, cheddar, pickles e molho secreto', price: 32.90, emoji: '🍔', badge: 'Best Seller', cat: 'Burgers', sort: 1 },
    { rid: 'rest_burger', name: 'Bacon Extreme', desc: 'Duplo smash, bacon crocante e onion rings', price: 39.90, emoji: '🍔', badge: null, cat: 'Burgers', sort: 2 },
    { rid: 'rest_burger', name: 'Veggie Burger', desc: 'Hambúrguer de grão-de-bico com guacamole', price: 29.90, emoji: '🍔', badge: 'Vegetariano', cat: 'Burgers', sort: 3 },
    { rid: 'rest_burger', name: 'Batata Frita Trufada', desc: 'Batata frita com azeite de trufa e parmesão', price: 22.90, emoji: '🍟', badge: null, cat: 'Acompanhamentos', sort: 4 },
    { rid: 'rest_burger', name: 'Milkshake Nutella', desc: 'Shake cremoso de Nutella com calda de chocolate', price: 19.90, emoji: '🥤', badge: null, cat: 'Bebidas', sort: 5 },
    { rid: 'rest_burger', name: 'Onion Rings', desc: 'Anéis de cebola empanados e crocantes', price: 18.90, emoji: '🧅', badge: null, cat: 'Acompanhamentos', sort: 6 },

    // Green Bowl Co.
    { rid: 'rest_green', name: 'Açaí Bowl Tropical', desc: 'Açaí com granola, banana, morango e mel', price: 28.90, emoji: '🫐', badge: 'Best Seller', cat: 'Bowls', sort: 1 },
    { rid: 'rest_green', name: 'Salada Caesar Grelhada', desc: 'Frango grelhado, croutons, parmesão e molho caesar', price: 34.90, emoji: '🥗', badge: null, cat: 'Saladas', sort: 2 },
    { rid: 'rest_green', name: 'Wrap Integral de Frango', desc: 'Tortilha integral com frango, alface e iogurte', price: 26.90, emoji: '🌯', badge: null, cat: 'Wraps', sort: 3 },
    { rid: 'rest_green', name: 'Suco Verde Detox', desc: 'Couve, maçã, gengibre, limão e hortelã', price: 14.90, emoji: '🥤', badge: 'Fitness', cat: 'Sucos', sort: 4 },
    { rid: 'rest_green', name: 'Bowl de Quinoa', desc: 'Quinoa, abacate, edamame, tomate cereja e tahine', price: 36.90, emoji: '🥗', badge: 'Vegano', cat: 'Bowls', sort: 5 },
    { rid: 'rest_green', name: 'Smoothie de Frutas Vermelhas', desc: 'Mix de morango, mirtilo e framboesa com iogurte', price: 16.90, emoji: '🥤', badge: null, cat: 'Sucos', sort: 6 },

    // Pizza Club 24h
    { rid: 'rest_pizza', name: 'Margherita Napoletana', desc: 'Molho San Marzano, mozzarella di bufala e manjericão', price: 44.90, emoji: '🍕', badge: 'Best Seller', cat: 'Pizzas', sort: 1 },
    { rid: 'rest_pizza', name: 'Pepperoni Supreme', desc: 'Pepperoni artesanal, mozzarella e orégano', price: 48.90, emoji: '🍕', badge: null, cat: 'Pizzas', sort: 2 },
    { rid: 'rest_pizza', name: 'Quatro Queijos', desc: 'Mozzarella, gorgonzola, provolone e parmesão', price: 46.90, emoji: '🍕', badge: null, cat: 'Pizzas', sort: 3 },
    { rid: 'rest_pizza', name: 'Pizza de Nutella', desc: 'Nutella, morango fatiado e confete de chocolate', price: 38.90, emoji: '🍕', badge: 'Novo', cat: 'Pizzas Doces', sort: 4 },
    { rid: 'rest_pizza', name: 'Calzone de Presunto', desc: 'Massa recheada com presunto, mozzarella e orégano', price: 36.90, emoji: '🥟', badge: null, cat: 'Calzones', sort: 5 },
    { rid: 'rest_pizza', name: 'Breadsticks com Alho', desc: 'Palitos de massa com manteiga de alho e parmesão', price: 18.90, emoji: '🥖', badge: null, cat: 'Entradas', sort: 6 },
    { rid: 'rest_pizza', name: 'Refrigerante 2L', desc: 'Coca-Cola, Guaraná ou Sprite', price: 12.90, emoji: '🥤', badge: null, cat: 'Bebidas', sort: 7 },

    // Brasa & Lenha
    { rid: 'rest_brasa', name: 'Picanha na Brasa 500g', desc: 'Picanha maturada com farofa, vinagrete e arroz', price: 69.90, emoji: '🥩', badge: 'Best Seller', cat: 'Carnes', sort: 1 },
    { rid: 'rest_brasa', name: 'Costela Desfiada', desc: 'Costela cozida por 12h com molho barbecue', price: 54.90, emoji: '🥩', badge: null, cat: 'Carnes', sort: 2 },
    { rid: 'rest_brasa', name: 'Fraldinha Grelhada', desc: 'Fraldinha com chimichurri e batatas rústicas', price: 52.90, emoji: '🥩', badge: null, cat: 'Carnes', sort: 3 },
    { rid: 'rest_brasa', name: 'Espeto Misto', desc: 'Espeto com picanha, linguiça e frango', price: 38.90, emoji: '🍢', badge: null, cat: 'Espetos', sort: 4 },
    { rid: 'rest_brasa', name: 'Farofa Especial da Casa', desc: 'Farofa com bacon, ovo e banana', price: 16.90, emoji: '🥣', badge: null, cat: 'Acompanhamentos', sort: 5 },
    { rid: 'rest_brasa', name: 'Vinagrete Fresco', desc: 'Tomate, cebola, pimentão e coentro', price: 8.90, emoji: '🥗', badge: null, cat: 'Acompanhamentos', sort: 6 },
    { rid: 'rest_brasa', name: 'Pudim de Leite', desc: 'Pudim cremoso com calda de caramelo', price: 18.90, emoji: '🍮', badge: null, cat: 'Sobremesas', sort: 7 },
    { rid: 'rest_brasa', name: 'Caipirinha Artesanal', desc: 'Limão tahiti, cachaça premium e açúcar demerara', price: 22.90, emoji: '🍹', badge: 'Picante', cat: 'Bebidas', sort: 8 },
  ];

  for (const m of menuItems) {
    menuStmt.run(m.rid, m.name, m.desc, m.price, m.emoji, m.badge, m.cat, m.sort);
  }
  console.log(`  -> ${menuItems.length} menu items seeded`);

  // --- Coupons ---
  const couponStmt = db.prepare(`
    INSERT INTO coupons (id, code, discount_type, discount_value, min_order, max_uses, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  couponStmt.run('coupon_mvp10', 'MVP10', 'fixed', 10, 80, 1000);
  couponStmt.run('coupon_frete', 'FRETEGRATIS', 'fixed', 0, 0, 500);
  console.log('  -> 2 coupons seeded (MVP10, FRETEGRATIS)');

  // --- Users ---
  const userStmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, phone, role, restaurant_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminHash = bcrypt.hashSync('Adm!nF00d@2026', BCRYPT_ROUNDS);
  const pastaHash = bcrypt.hashSync('P@sta&Fogo#2026', BCRYPT_ROUNDS);
  const userHash = bcrypt.hashSync('Us3r$Food!2026', BCRYPT_ROUNDS);

  userStmt.run('user_admin', 'admin@foodflow.com', adminHash, 'Admin ECP Food', '11999990000', 'admin', null);
  userStmt.run('user_pasta', 'pasta@foodflow.com', pastaHash, 'Gerente Pasta & Fogo', '11999991111', 'restaurant', 'rest_pasta');
  userStmt.run('user_consumer', 'user@foodflow.com', userHash, 'João Silva', '11999992222', 'consumer', null);
  console.log('  -> 3 users seeded (admin, restaurant, consumer)');

  // --- Address for consumer ---
  db.prepare(`
    INSERT INTO addresses (user_id, label, street, number, complement, neighborhood, city, state, zip_code, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run('user_consumer', 'Casa', 'Rua Augusta', '1234', 'Apto 42', 'Consolação', 'São Paulo', 'SP', '01305-100');
  console.log('  -> 1 address seeded for consumer');

  console.log('\nSeed complete!');
  console.log('Login credentials:');
  console.log('  Admin:       admin@foodflow.com / Adm!nF00d@2026');
  console.log('  Restaurant:  pasta@foodflow.com / P@sta&Fogo#2026');
  console.log('  Consumer:    user@foodflow.com / Us3r$Food!2026');

  closeDb();
}

seed();
