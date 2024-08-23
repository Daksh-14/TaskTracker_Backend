import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'
import 'dotenv/config'

cloudinary.config({ 
    cloud_name: process.env.cloud_name, 
    api_key: process.env.api_key, 
    api_secret: process.env.api_secret
});

const uploadfiles=async(filePath)=>{
    try{
        if(!filePath){
            return null;
        }
        const response=await cloudinary.uploader.upload(filePath,{
            resource_type:"auto"
        })
        return response;
    }
    catch(error){
        return null;
    }
    finally{
        fs.unlinkSync(filePath)

    }
}

const deleteFromCloudinary = async (url) => {
    const publicId = url.split('/').pop().split('.')[0]; // Extract public ID from URL
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted file from Cloudinary: ${publicId}`);
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
    }
  };

export {uploadfiles,deleteFromCloudinary};
