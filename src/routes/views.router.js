import { Router } from "express";
import { MongoProductManager } from '../DATA/DAOs/productsMongo.dao.js';
import userModel from "../DATA/mongoDB/models/user.model.js";

const productManagerInstance = new MongoProductManager(); 

const router = Router();

router.get('/', async (req, res) => {
    try {
        const products = await productManagerInstance.getProducts();
        res.render('home', { products });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener listado de productos' });
    }
});

router.get('/products', async (req, res) => {
  try {
      const products = await productManagerInstance.getProducts();
      res.render('products', { products, user: req.session.user });
  } catch (error) {
      res.status(500).json({ error: 'Error al obtener listado de productos' });
  }
});


router.get('/realtimeproducts', async (req, res) => {
    try {
        const products = await productManagerInstance.getProducts() ;
        res.render('realTimeProducts', { products }); 
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el listado de productos' });
    }
});

  router.delete('/delete/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        const deletedProduct = await productManagerInstance.deleteProduct(productId);
    if (deletedProduct) {
      socketServer.emit('deleteProduct', productId);
      res.status(200).json({ message: `Producto ID ${productId} eliminado.` });
    } else {
      res.status(404).json({ error: `No se encontró producto con el ID ${productId}.` });
    }
    } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
});

router.get('/carts/:cid', async (req, res) => {
  const cartId = req.params.cid;
  try {
    const cart = await cartManagerInstance.getPopulatedCartById(cartId);
    res.render('carts', { products: cart.products });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});
  
const publicAcces = (req,res,next) =>{
  if(req.session.user) return res.redirect('/profile');
  next();
}

const privateAcces = (req,res,next)=>{
  if(!req.session.user) return res.redirect('/login');
  next();
}


router.get('/register', publicAcces, (req,res)=>{
  res.render('register')
})

router.get('/login', publicAcces, (req,res)=>{
  res.render('login')
})

router.get('/profile', privateAcces ,(req,res)=>{
  res.render('profile',{
      user: req.session.user
  })
})

router.get('/api/mail', (req, res) =>{
  res.render('mail');
});

//ADMIN DE USUARIOS http://localhost:8080/api/views/admin/users
router.get('/admin/users', async (req, res) => {
  try {
    const users = await userModel.find({}, {username: 1, first_name: 1, last_name: 1, email: 1, role: 1}).lean();
    res.render('adminViews', { users: users }); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:userId/updateRole', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    await userModel.findByIdAndUpdate(userId, { role });
    res.redirect('/admin/users'); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:userId/delete', async (req, res) => {
  const { userId } = req.params;

  try {
    await userModel.findByIdAndDelete(userId);
    res.redirect('/admin/users'); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;