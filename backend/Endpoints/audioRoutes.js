import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import Audio from '../Database Schema/Audio.js';
import dotenv from 'dotenv';
import { authMiddleware } from '../Utils/jwt.js';

dotenv.config({ path: '../.env' });

const upload = multer();
const audioRoutes = express.Router();

//configure AWS S3 bucket
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
});

//GET ALL AUDIO DATA
audioRoutes.get('/audio', async (req, res) => {
    return res.status(200).json({ message: 'This is audio data from the audio route.' });
})

//GET ONLY ID AND DOCUMENT NAME FROM ALL AUDIO DATA
audioRoutes.get('/audio/metadata', async (req, res) => {
    console.log("IN GET ROUTE OF /audio/metadata")
    try {
        const audioMetadata = await Audio.find({}, { _id: 1, documentName: 1 });
        if (!audioMetadata) {
            return res.status(404).json({ message: 'Audio metadata not found.' });
        }
        return res.status(200).json(audioMetadata);
    } catch (error) {
        console.error('Error fetching audio metadata:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
})

//GET AUDIO DATA AND DOCUMENT NAME BY USER ID
audioRoutes.get('/audio/u/metadata', authMiddleware, async (req, res) => {
    console.log("IN GET ROUTE OF /audio/u/metadata")
    const userId = req.user.id;
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }
    try {
        const audioMetadata = await Audio.find({ userId }, { _id: 1, documentName: 1 });
        if (!audioMetadata) {
            return res.status(404).json({ message: 'Audio metadata not found.' });
        }
        return res.status(200).json(audioMetadata);
    } catch (error) {
        console.error('Error fetching audio metadata:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
})

//GET AUDIO DATA BY ID
audioRoutes.get('/audio/:audioId', async (req, res) => {
    console.log("IN GET ROUTE OF /audio/:audioId")
    const { audioId } = req.params;
    if (!audioId) {
        return res.status(400).json({ message: 'Audio ID is required.' });
    }
    try {
        // Fetch audio data from mongoDB
        const audioData = await Audio.findOne({ _id: audioId });
        if (!audioData) {
            return res.status(404).json({ message: 'Audio data not found.' });
        }

        console.log('Audio data:', audioData);

        return res.status(200).json(audioData);
    } catch (error) {
        console.error('Error fetching audio data:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
})

//POST AUDIO DATA
audioRoutes.post('/audio', upload.single('audio'), async (req, res) => {
    console.log("IN POST ROUTE OF /audio")
    const { documentName, transcription, translation, language, userId } = req.body;
    const audioFile = req.file;
    if (!audioFile) {
        return res.status(400).json({ message: 'Audio file is required.' });
    }
    console.log(translation);
    if (!transcription || !translation || !language) {
        return res.status(400).json({ message: 'Transcription, translation, and language are required.' });
    }
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }
    try {
        //Create a unique key for the audio file of S3
        const s3Key = `audio/${Date.now()}_${documentName}.mp3`;
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: audioFile.buffer,
            ContentType: audioFile.mimetype,
        };
        // Get the URL of the audio file in the S3 bucket to store in the MONGO
        const s3AudioUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        // Store the audio data in the mongoDB
        const newAudioData = {
            documentName,
            transcription,
            translation,
            language,
            s3AudioUrl,
            userId: userId,
        };
        console.log('Audio data:', newAudioData);
        const newAudio = await new Audio(newAudioData).save();
        // Upload audio file to S3 bucket
        await s3Client.send(new PutObjectCommand(s3Params));
        console.log('Audio file uploaded to S3 bucket:', s3Key);
        return res.status(200).json(newAudio);
    } catch (error) {
        console.error('Error posting audio data:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
})

//PUT AUDIO DATA
audioRoutes.put('/audio/:id', async (req, res) => {
    console.log("IN PUT ROUTE OF /audio/:id")
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Audio ID is required.' });
    }
    const updateFields = {};
    for (const key in req.body) {
        if (req.body[key] !== null && req.body[key] !== undefined) {
            updateFields[key] = req.body[key];
        }
    }
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
    }
    try {
        const audio = await Audio.findOneAndUpdate({ _id: id }, updateFields, { new: true });
        if (!audio) {
            return res.status(404).json({ message: `Cannot find audio in db with Id: ${id}` });
        }
        return res.status(200).json({ message: `Audio data has been updated with Id: ${id}` , audio });
    } catch (error) {
        console.error('Error updating audio data:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
})

//DELETE AUDIO DATA
audioRoutes.delete('/audio/:audioId', async (req, res) => {
    const { audioId } = req.params;
    console.log("IN DELETE ROUTE OF /audio/:audioId")
    if (!audioId) {
        return res.status(400).json({ message: 'Audio ID is required.' });
    }
    try {
        const audio = await Audio.findOneAndDelete({ _id: audioId });
        if (!audio) {
            return res.status(404).json({ message: `Cannot find audio in db with Id: ${audioId}` });
        }
        const s3AudioUrl = audio.s3AudioUrl;
        const s3Key = s3AudioUrl.split('.com/')[1];
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
        };
        // Delete the file from S3
        await s3Client.send(new DeleteObjectCommand(s3Params));
        return res.status(200).json({ message: `Audio with ID ${audioId} has been deleted.` });
    } catch (error) {
        console.error('Error deleting audio data:', error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
})

export default audioRoutes;