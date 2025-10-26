import doctorModel from '../models/doctorModel.js';




const changeAvailability =async (req,res) =>{

    try{
            const {docId} =req.body
            const docData =await doctorModel.findById(docId)

            // Toggle the correct `availability` field
            const updatedAvailability = !docData.availability;
            await doctorModel.findByIdAndUpdate(docId,{ availability: updatedAvailability })

            res.json ({success:true,message:"Availability Changed", availability: updatedAvailability })



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
            speciality: doc.specialization, // Map specialization to speciality
            availability: doc.availability, // Ensure availability is included
        }));
        res.json({success:true,doctors:formattedDoctors})
    }
    catch(error){
        console.log(error)
        res.json({ success: false, message: error.message });
    }
}



export {changeAvailability,doctorList}