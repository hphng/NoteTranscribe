import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause, faVolumeHigh, faVolumeXmark, faDownload } from '@fortawesome/free-solid-svg-icons'
import getBlobDuration from "get-blob-duration";
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';

const DocumentDetails = () => {
  const audioId = useParams().id;
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');

  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  useEffect(() => {
    const getAudioData = async () => {
      try {
        const response = await axios.get(`/api/audio/${audioId}`);
        const data = response.data;
        // console.log(data);
        setDocument(data);
        setTranscription(data.transcription || '');
        setTranslation(data.translation || '');
      } catch (error) {
        console.error('Error fetching audio data:', error.message);
      }
    };
    getAudioData();
  }, [audioId]);

  useEffect(() => {
    if (document && document.s3AudioUrl) {
      const setAudioDuration = async () => {
        try {
          const audioResponse = await axios.get(document.s3AudioUrl, { responseType: 'blob' });
          const audioBlob = audioResponse.data;
          // Use getBlobDuration to calculate the duration
          const audioDuration = await getBlobDuration(audioBlob);
          setDuration(audioDuration);
        } catch (error) {
          console.error('Error fetching audio blob:', error.message);
        }
      };
      setAudioDuration();
    }
  }, [document]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""
      }${seconds}`;
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  //handle time update on progess bar
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    setCurrentTime(audio.currentTime);
    const progressPercentage = parseFloat((audio.currentTime / audio.duration) * 100);
    progressBarRef.current.value = progressPercentage;
    console.log(progressBarRef.current.value);
    progressBarRef.current.style.setProperty("--seek-before-width", `${progressPercentage}%`);
  };

  //handle progress change on progress bar
  const handleProgressChange = (e) => {
    const audio = audioRef.current;
    const value = e.target.value;
    const seekTime = (value / 100) * audio.duration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  //handle muted and unmuted
  const toggleMute = () => {
    const audio = audioRef.current;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  }

  const backToDocumentList = () => {
    navigate("/a");
    window.scrollTo(0, 0);
  }

  const handleTranscriptionChange = (e) => {
    setTranscription(e.target.value);
  }

  const handleTranslationChange = (e) => {
    setTranslation(e.target.value);
  }

  const saveChanges = async () => {
    console.log('Saving changes...');
    if(document.transcription === transcription && document.translation === translation) {
      toast.info('No changes detected.', {
        position: 'top-right',
        autoClose: 2000,
      })
      return;
    }
    try {
      const response = await axios.put(`/api/audio/${audioId}`, {
        transcription,
        translation,
      });
      console.log('Save changes:', response.data);
      document.transcription = transcription;
      document.translation = translation;
      toast.success('Changes saved successfully!', {
        position: 'top-right',
        autoClose: 2000,
      })
    } catch (error) {
      console.error('Error saving changes:', error.message);
      toast.error('Error saving changes. Please try again.', {
        position: 'top-right',
        autoClose: 2000,
      })
    }
  }

  if (!document) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen mt-20 max-w-4xl mx-auto flex flex-col items-center">
      <h1 className="text-5xl font-bold text-orange-600 mb-12 text-center">{document.documentName}</h1>
      {/* audio part */}
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} preload="auto">
        <source src={document.s3AudioUrl} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <div className="w-[80%] p-2 bg-transparent border-2 border-black shadow-md shadow-orange-500 rounded-xl mb-4 flex flex-row">
        <button
          onClick={togglePlayPause}
          className="text-black w-8 aspect-square rounded-full fa-sm bg-orange-500/50 hover:bg-orange-500/80 flex items-center justify-center"
        >
          {isPlaying ? <FontAwesomeIcon icon={faPause} /> : <FontAwesomeIcon icon={faPlay} />}
        </button>

        <div className="flex items-center px-3 space-x-2 relative w-[85%]">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            ref={progressBarRef}
            className="w-64 custom-range-slider"
            onChange={handleProgressChange}
            defaultValue="0"
          />
          <span>{formatTime(duration)}</span>
        </div>
        <button
          onClick={toggleMute}
          className="text-black w-8 aspect-square rounded-full fa-sm bg-orange-500/50 hover:bg-orange-500/80 flex items-center justify-center"
        >
          {isMuted ? <FontAwesomeIcon icon={faVolumeXmark} /> : <FontAwesomeIcon icon={faVolumeHigh} />}
        </button>
        <button className="text-black ml-2 w-8 aspect-square rounded-full fa-sm bg-orange-500/50 hover:bg-orange-500/80 duration-200 flex items-center justify-center">
          <a href={document.s3AudioUrl} download>
            <FontAwesomeIcon icon={faDownload} />
          </a>
        </button>
      </div>
      {/* transcription and translation */}
      <h2 className="text-3xl font-semibold m-4 text-orange-600">Transcription</h2>
      <textarea
        className="p-4 w-full min-h-[300px] bg-gray-100 text-gray-700 shadow-md shadow-orange-500 border-2 border-black text-left rounded-lg
                  mobile:min-h-[200px] mobile:w-[90%]"
        value={transcription}
        onChange={handleTranscriptionChange}
      />

      <h2 className="text-3xl font-semibold m-4 text-orange-600">Translation ({document.language})</h2>
      <textarea
        className="p-4 w-full min-h-[300px] bg-gray-100 text-gray-700 shadow-md shadow-orange-500 border-2 border-black text-left rounded-lg
                  mobile:min-h-[200px] mobile:w-[90%]"
        value={translation}
        onChange={handleTranslationChange}
      />
      {/* back to list button */}
      <div className="flex justify-end gap-8">
        <button
          className="my-12 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          onClick={saveChanges}
        >
          Save Changes
        </button>
        <button
          className="my-12 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          onClick={backToDocumentList}
        >
          Back to List
        </button>
      </div>
      <ToastContainer pauseOnFocusLoss={false}/>
    </div>
  );
};

export default DocumentDetails
