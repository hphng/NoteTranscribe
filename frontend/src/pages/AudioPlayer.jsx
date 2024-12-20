import React, { useState, useRef, useEffect, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faVolumeHigh, faVolumeXmark, faDownload, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import Transcribe from '../components/Transcribe';
import Translate from "../components/Translate";
import {
  Tab, TabGroup, TabList, TabPanel, TabPanels,
  Description, Dialog, DialogPanel, DialogBackdrop, DialogTitle,
  Field, Input, Label
} from '@headlessui/react'
import axios from "axios";
import { AuthContext } from '../contexts/AuthContext';

const AudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [documentName, setDocumentName] = useState('Untitled Document');
  const [transcribedText, setTranscribedText] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);
  const [translateLanguage, setTranslateLanguage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { user } = useContext(AuthContext);

  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const navigate = useNavigate();

  //get the current location
  const location = useLocation();
  let { audioURL, audioDuration } = location.state || {};

  //play and pause audio
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audioDuration) {
      audioDuration = audio.duration;
    }

    const updateDuration = () => setDuration(audioDuration);
    audio.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""
      }${seconds}`;
  };

  const backToMain = () => {
    navigate(-1);
  };

  //Modal operations
  const openModal = () => {
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
  }

  const needLogin = () => {
    toast.error('Please login to save your document!', {
      position: "top-right",
      className: 'bg-red-500 text-white',
    });
    // navigate('/login');
  }

  const saveDocument = async () => {
    //save document to database
    console.log('Document saved');
    const formData = new FormData();
    //apppend form data
    formData.append('documentName', documentName);
    formData.append('transcription', transcribedText);
    if (!translatedText) {
      formData.append('translation', 'No translation available');
      formData.append('language', 'No language selected');
    } else {
      formData.append('translation', translatedText);
      formData.append('language', translateLanguage);
    }
    formData.append('userId', user._id);
    //fetch audio file
    const blob = await fetch(audioURL).then(res => res.blob());
    formData.append('audio', blob, 'audio.mp3');

    try {
      axios.post('/api/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
        .then((res) => {
          console.log(res.data);
          toast.success('Document saved successfully!', {
            position: "top-right",
            className: 'bg-green-500 text-white',
          });
          closeModal();
        })
        .catch((err) => {
          console.log(err);
          toast.error('Error saving document!', {
            position: "top-right",
            className: 'bg-red-500 text-white',
          });
        });
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center ${transcribedText ? "pt-20" : ""}`}>
      {!transcribedText && (<h1 className="text-6xl font-bold pb-4">Your <span className='bold text-orange-500'>Scribe</span></h1>)}
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} preload="auto">
        <source src={audioURL} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
      <div className="w-auto p-2 bg-transparent border-2 border-black shadow-md shadow-orange-500 rounded-xl flex flex-row">
        <button
          onClick={togglePlayPause}
          className="text-black w-8 aspect-square rounded-full fa-sm bg-orange-500/50 hover:bg-orange-500/80 flex items-center justify-center"
        >
          {isPlaying ? <FontAwesomeIcon icon={faPause} /> : <FontAwesomeIcon icon={faPlay} />}
        </button>

        <div className="flex items-center px-3 space-x-2 relative">
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
          <a href={audioURL} download>
            <FontAwesomeIcon icon={faDownload} />
          </a>
        </button>
      </div>
      <TabGroup className="flex flex-col items-center mt-5 w-full">
        <TabList className="flex flex-row">
          <Tab className="px-4 py-2 text-white rounded-tl-full rounded-bl-full bg-gray-300 data-[selected]:bg-orange-500">
            Transcribe
          </Tab>
          <Tab
            className="px-4 py-2 text-white rounded-tr-full rounded-br-full bg-gray-300 data-[selected]:bg-orange-500"
            onClick={(event) => {
              if (!transcribedText) {
                event.preventDefault();
                toast.error("Please transcribe text first!", {
                  position: "top-right",
                  className: 'bg-red-500 text-white',
                });
              }
            }}
          >
            Translate
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel unmount={false}>
            <Transcribe
              audioURL={audioURL}
              onTranscribeComplete={setTranscribedText}
            />
          </TabPanel>
          <TabPanel unmount={false}>
            <Translate
              text={transcribedText}
              onTranslationComplete={setTranslatedText}
              onTranslateLanguage={setTranslateLanguage}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
      <div className='absolute bottom-10 left-[3%] flex flex-row justify-between'>
        <button
          className={` mt-4 px-4 py-2 text-white rounded-lg bg-orange-500 hover:bg-orange-600 hover:shadow-md duration-200`}
          onClick={backToMain}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
      </div>

      {/* Button to trigger modal */}
      <button
        onClick={openModal}
        className={`absolute bottom-10 left-[50%] -translate-x-1/2  px-4 py-2 text-white rounded-lg ${!transcribedText
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-green-500 hover:bg-green-600"
          }`}
        disabled={!transcribedText}
      >
        Save
      </button>
      <ToastContainer pauseOnFocusLoss={false} />
      <Dialog open={isModalOpen} onClose={closeModal} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 w-screen p-4">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel
              className="max-w-lg max-h-96 overflow-y-auto overflow-hidden space-y-4 border bg-orange-100 p-12 rounded-lg
                        scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-orange-200"
            >
              <DialogTitle className="font-bold text-3xl text-center">Your document</DialogTitle>
              <Field>
                <Input
                  name="full_name"
                  type="text"
                  placeholder="Document Name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className='rounded-lg flex-grow w-full p-2 bg-orange-100 shadow-md border-2 border-black 
                            data-[focus]:outline-offset-1 data-[focus]:shadow-orange-500'
                />
              </Field>
              <Description className='font-bold'> Transcription (English)</Description>
              <p>{transcribedText ? transcribedText : "no transcription available"}</p>
              <Description className='font-bold'>
                Translation ({translateLanguage ? translateLanguage : "no language selected"})
              </Description>
              <p>{translatedText ? translatedText : "no translation available"}</p>
              <div className="flex gap-4 pt-6">
                <button onClick={closeModal} className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg">Cancel</button>
                <button onClick={user ? saveDocument : needLogin} className="px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg">Save</button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AudioPlayer;