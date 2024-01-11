import { Router } from 'express';
import userModel from '../DATA/mongoDB/models/user.model.js'
import cartModel from '../DATA/mongoDB/models/carts.model.js'
import passport from 'passport';
import bcrypt from 'bcrypt';
import config from '../config.js';
import UsersDto from '../DATA/DTOs/users.dto.js';

const router = Router();

router.post('/register', async (req, res) =>{
    const {first_name, last_name, email, age, password} = req.body;

    const exist = await userModel.findOne({email});

    if(exist){
        return res.status(400).send({status:"error", error:"El usuario ya existe"});
    }

    const user = {
        first_name, last_name, email, age, password
    };

    const result = await userModel.create(user);
    res.send({status:"succes", message:"Usuario registrado correctamente"});
})

router.post('/login',  async (req,res)=>{
    const { email, password } = req.body; 
     const user = await userModel.findOne({email}) 

    if(!user){
        return res.status(400).send({status:"error", error:"Datos incorrectos"})
    }

   const isPasswordValid = await bcrypt.compare(password, user.password);
   if (!isPasswordValid && password === user.password) {   
   } else if (!isPasswordValid) {
       return res.status(400).send({ status: "error", error: "Datos incorrectos" });
   }

    if (!user.cart) {
        const newCart = await cartModel.create({ products: [], productsNotPurchased: [] });
        user.cart = newCart._id;
        await user.save();
    }

    if (email === config.adminEmail && password === config.adminPassword) {
        user.role = 'ADMIN';
      }  
      req.session.user = {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        age: user.age,
        role: user.role,
        cart: user.cart,
      }
    res.redirect('/api/views/products');
})

router.get('/logout', (req,res)=>{
    req.session.destroy(err =>{
        if(err) return res.status(500).send({status:"error", error:"No pudo cerrar sesión"})
        res.redirect('/login');
    })
})

router.get('/github', passport.authenticate('github', {scope:['user:email']}), async (req, res)=>{})
router.get('/githubcallback', passport.authenticate('github',{failureRedirect: '/login'}), async (req, res)=>
{
    req.session.user = req.user
    res.redirect('/profile')
})


router.get('/current', (req, res) => {
    const userDto = new UsersDto(req.session.user); 
    res.status(200).json({ user: userDto });
});

router.put('/users/premium/:uid', async (req, res) => {
    try {
      const uid = req.params.uid;
      const user = await userModel.findOne({ _id: uid });
  
      if (!user) {
        return res.status(404).json({ status: "error", error: "Usuario no encontrado" });
      } 
      user.role = user.role === "usuario" ? "premium" : "usuario";
      await user.save();
      return res.status(200).json({ status: "success", message: `Rol del usuario ${user.email} actualizado a ${user.role}` });
    } catch (error) {
      return res.status(500).json({ status: "error", error: "Error al actualizar el rol del usuario" });
    }
});


export default router;