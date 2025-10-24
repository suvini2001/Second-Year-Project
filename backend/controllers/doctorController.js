import doctorModel from '../models/doctorModel.js';




const changeAvailability =async (req,res) =>{

    try{
            const {docId} =req.body
            const docData =await doctorModel.findById(docId)

            await doctorModel.findByIdAndUpdate(docId,{availabile: !docData.availabile})
            res.json ({success:true,message:"Availability Changed"})



    }

    catch(error){
        console.log(error)
        res.json({ success: false, message: error.message });
    }

}

const doctorList= async(req,res) =>{
    try{
        const doctors =await doctorModel.find({}).select(['-password','-email'])
        const formattedDoctors = doctors.map((doc) => ({
            ...doc.toObject(),
            speciality: doc.specialization // Map specialization to speciality
        }));
        res.json({success:true,doctors:formattedDoctors})
    }
    catch(error){
        console.log(error)
        res.json({ success: false, message: error.message });
    }
}



export {changeAvailability,doctorList}