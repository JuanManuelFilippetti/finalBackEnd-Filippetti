import { Router } from "express";
import { transporter } from "../nodemailer.js";
const router = Router();

router.get("/", async (req, res)=>{
    const messageOpt ={
        from: "futura73@gmail.com", 
        to: "futura73@gmail.com",
        subject: "GRACIAS POR TU COMPRA",
        text: "Pronto recibirás tus productos!",
    };
    await transporter.sendMail(messageOpt);
    res.send('Mail enviado correctamente!')
});

export default router;