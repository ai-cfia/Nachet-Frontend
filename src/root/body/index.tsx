import { useState, useRef, useEffect } from "react";
import type Webcam from "react-webcam";
import { saveAs } from "file-saver";
import { BodyContainer } from "./indexElements";
import Classifier from "../../pages/classifier";
import SavePopup from "../../components/body/save_capture_popup";
import UploadPopup from "../../components/body/load_image_popup";
import SwitchModelPopup from "../../components/body/switch_model_popup";
import SwitchDevice from "../../components/body/switch_device_popup";
import CreateDirectory from "../../components/body/create_directory_popup";
import DeleteDirectoryPopup from "../../components/body/del_directory_popup";
import ResultsTunerPopup from "../../components/body/results_tuner_popup";
import axios from "axios";

interface ImageCache {
  index: number;
  src: string;
  scores: number[];
  classifications: string[];
  boxes: any[];
  annotated: boolean;
  imageDims: number[];
  overlapping: boolean[];
  overlappingIndex: number[];
  totalBoxes: number;
  labelOccurrence: any;
}

interface params {
  windowSize: {
    width: number;
    height: number;
  };
  uuid: string;
}

const Body: React.FC<params> = (props) => {
  const [imageSrc, setImageSrc] = useState<string>(
    "https://ai-cfia.github.io/nachet-frontend/placeholder-image.jpg",
  );
  const [imageSrcKey, setImageSrcKey] = useState<boolean>(false);
  const [resultsRendered, setResultsRendered] = useState<boolean>(false);
  const [imageIndex, setImageIndex] = useState<number>(0);
  const [imageFormat, setImageFormat] = useState<string>("image/png");
  const [imageLabel, setImageLabel] = useState<string>("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [switchModelOpen, setSwitchModelOpen] = useState(false);
  const [switchDeviceOpen, setSwitchDeviceOpen] = useState(false);
  const [createDirectoryOpen, setCreateDirectoryOpen] = useState(false);
  const [imageCache, setImageCache] = useState<ImageCache[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(
    undefined,
  );
  const [curDir, setCurDir] = useState<string>("");
  const [azureStorageDir, setAzureStorageDir] = useState<any[]>([]);
  const [delDirectoryOpen, setDelDirectoryOpen] = useState<boolean>(false);
  const [resultsTunerOpen, setResultsTunerOpen] = useState<boolean>(false);
  const [scoreThreshold, setScoreThreshold] = useState<number>(50);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadCaptureToCache = (src: string): void => {
    setImageCache((prevCache) => [
      ...prevCache,
      {
        index:
          imageCache.length > 0
            ? imageCache[imageCache.length - 1].index + 1
            : imageIndex + 1,
        src,
        scores: [],
        classifications: [],
        boxes: [],
        annotated: false,
        imageDims: [],
        overlapping: [],
        overlappingIndex: [],
        totalBoxes: 0,
        labelOccurrence: {},
      },
    ]);
    setImageIndex(
      imageCache.length > 0
        ? imageCache[imageCache.length - 1].index + 1
        : imageIndex + 1,
    );
  };

  const getCurrentImage = (index: number): void => {
    if (imageCache.length >= 1) {
      imageCache.forEach((image) => {
        if (image.index === index) {
          setImageSrc(image.src);
          if (image.src === imageSrc) {
            setImageSrcKey(!imageSrcKey);
          }
        }
      });
    } else {
      setImageSrc(
        "https://ai-cfia.github.io/nachet-frontend/placeholder-image.jpg",
      );
    }
  };

  const captureFeed = (): void => {
    const src: string | null | undefined = webcamRef.current?.getScreenshot();
    if (src === null || src === undefined) {
      return;
    }
    loadCaptureToCache(src);
  };

  const uploadImage = (event: any): void => {
    event.preventDefault();
    const file = event.target.files[0];
    if (file !== undefined) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result !== "string") {
          return;
        }
        loadCaptureToCache(reader.result);
      };
      reader.readAsDataURL(file);
    }
    setUploadOpen(false);
  };

  const loadFromCache = (index: number): void => {
    setImageIndex(index);
  };

  const removeFromCache = (index: number): void => {
    const newCache = imageCache.filter((item) => item.index !== index);
    setImageCache(newCache);
    if (newCache.length >= 1) {
      setImageIndex(newCache[newCache.length - 1].index);
    } else {
      setImageIndex(0);
    }
  };

  const clearCache = (): void => {
    setImageCache([]);
    setImageIndex(0);
  };

  const saveImage = (): void => {
    saveAs(
      imageSrc,
      `${imageLabel}-${new Date().getFullYear()}-${
        new Date().getMonth() + 1
      }-${new Date().getDate()}.${imageFormat.split("/")[1]}`,
    );
    setSaveOpen(false);
  };

  const loadResultsToCache = (inferenceData: any): void => {
    inferenceData.forEach((object: any) => {
      object.boxes.forEach((params: any) => {
        setImageCache((prevCache) =>
          prevCache.map((item) => {
            if (
              item.index === imageIndex &&
              object.boxes.length !== item.scores.length
            ) {
              return {
                ...item,
                scores: [...item.scores, params.score.toFixed(2)],
                classifications: [...item.classifications, params.label],
                boxes: [...item.boxes, params.box],
                overlapping: [...item.overlapping, params.overlapping],
                overlappingIndex: [
                  ...item.overlappingIndex,
                  params.overlappingIndex,
                ],
                annotated: true,
              };
            }
            return item;
          }),
        );
      });
    });
    setImageCache((prevCache) =>
      prevCache.map((item) => {
        if (item.index === imageIndex) {
          return {
            ...item,
            totalBoxes: inferenceData[0].totalBoxes,
            labelOccurrence: inferenceData[0].labelOccurrence,
          };
        }
        return item;
      }),
    );
    setResultsRendered(!resultsRendered);
  };

  const handleDirChange = (dir: string): void => {
    setCurDir(dir);
  };

  const addToDirectory = (): void => {
    if (!azureStorageDir.includes(curDir)) {
      setAzureStorageDir([...azureStorageDir, curDir]);
      setCreateDirectoryOpen(false);
    } else {
      alert("Directory already exists");
    }
  };

  const delFromDirectory = (): void => {
    (async () => {
      try {
        await axios({
          method: "post",
          url: `http://localhost:2323/del`,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          data: {
            container_name: props.uuid,
            folder_name: curDir,
          },
        }).then((response) => {
          if (response.data.length > 0) {
            setCurDir("");
            getAzureStorageDir();
          } else {
            alert("Failed to delete directory");
          }
        });
      } catch (error) {
        alert(error);
      }
    })().catch((error) => {
      alert(error);
    });
  };

  const getAzureStorageDir = (): void => {
    (async () => {
      try {
        await axios({
          method: "post",
          url: `http://localhost:2323/dir`,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          data: {
            container_name: props.uuid,
          },
        }).then((response) => {
          setAzureStorageDir(response.data);
        });
      } catch (error) {
        console.log(error);
      }
    })().catch((error) => {
      console.error(error);
    });
  };

  const handleInferenceRequest = (): void => {
    if (curDir !== "") {
      const imageObject = imageCache.filter(
        (item) => item.index === imageIndex,
      );
      (async () => {
        try {
          await axios({
            method: "post",
            url: `http://localhost:2323/inf`,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            data: {
              image: imageSrc,
              imageDims: [
                imageObject[0].imageDims[0],
                imageObject[0].imageDims[1],
              ],
              folder_name: curDir,
              container_name: props.uuid,
            },
          }).then((response) => {
            loadResultsToCache(response.data);
          });
        } catch (error) {
          console.log(error);
          alert("Error fetching inference data");
        }
      })().catch((error) => {
        console.error(error);
        alert("Cannot connect to server");
      });
    } else {
      alert("Please select a directory");
    }
  };

  const loadToCanvas = (): void => {
    const image = new Image();
    image.src = imageSrc;
    const canvas: HTMLCanvasElement | null = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (ctx === null) {
      return;
    }
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      imageCache.forEach((storedImage) => {
        if (storedImage.index === imageIndex && storedImage.annotated) {
          storedImage.classifications.forEach((prediction, index) => {
            // !storedImage.overlapping[index]
            if (storedImage.scores[index] >= scoreThreshold / 100) {
              ctx.beginPath();
              ctx.font = "0.9vw Arial";
              ctx.fillStyle = "black";
              ctx.textAlign = "center";
              if (storedImage.boxes[index].topY <= 15) {
                ctx.fillText(
                  `[${(index + 1).toString()}] ${prediction
                    .split(" ")
                    .slice(1)
                    .join(" ")}`,
                  ((storedImage.boxes[index].bottomX as number) -
                    (storedImage.boxes[index].topX as number)) /
                    2 +
                    (storedImage.boxes[index].topX as number),
                  (storedImage.boxes[index].bottomY as number) + 25,
                );
              } else {
                ctx.fillText(
                  `[${(index + 1).toString()}] ${prediction
                    .split(" ")
                    .slice(1)
                    .join(" ")}`,
                  ((storedImage.boxes[index].bottomX as number) -
                    (storedImage.boxes[index].topX as number)) /
                    2 +
                    (storedImage.boxes[index].topX as number),
                  storedImage.boxes[index].topY - 8,
                );
              }
              ctx.font = "0.9vw Arial";
              ctx.textAlign = "left";
              ctx.fillStyle = "#4ee44e";
              ctx.fillText(
                `TOTAL DETECTIONS: ${storedImage.totalBoxes}`,
                10,
                canvas.height - 50,
              );
              let counter = 35;
              for (const key in storedImage.labelOccurrence) {
                ctx.font = "0.9vw Arial";
                ctx.textAlign = "left";
                ctx.fillStyle = "#4ee44e";
                const label = String(key)
                  .split(" ")
                  .slice(1)
                  .join(" ")
                  .toUpperCase();
                const total = String(storedImage.labelOccurrence[key]);
                ctx.fillText(
                  label + ": " + total,
                  10,
                  canvas.height - (50 + counter),
                );
                counter = counter + 35;
              }
              // bounding box
              ctx.lineWidth = 2;
              ctx.setLineDash([7, 7]);
              ctx.strokeStyle = "red";
              ctx.rect(
                storedImage.boxes[index].topX,
                storedImage.boxes[index].topY,
                storedImage.boxes[index].bottomX -
                  storedImage.boxes[index].topX,
                storedImage.boxes[index].bottomY -
                  storedImage.boxes[index].topY,
              );
              ctx.stroke();
              ctx.closePath();
            }
          });
        }
        if (storedImage.index === imageIndex) {
          storedImage.imageDims = [image.width, image.height];
          ctx.beginPath();
          ctx.font = "0.9vw Arial";
          ctx.textAlign = "left";
          ctx.fillStyle = "#4ee44e";
          ctx.fillText(`CAPTURE: ${storedImage.index}`, 10, canvas.height - 15);
          ctx.stroke();
          ctx.closePath();
        }
      });
    };
  };

  useEffect(() => {
    getCurrentImage(imageIndex);
  }, [imageIndex]);

  useEffect(() => {
    loadToCanvas();
  }, [imageSrc, imageSrcKey]);

  useEffect(() => {
    console.log(imageCache);
    loadToCanvas();
  }, [resultsRendered]);

  useEffect(() => {
    loadToCanvas();
  }, [scoreThreshold]);

  useEffect(() => {
    const updateDevices = async (): Promise<any> => {
      try {
        const availableDevices =
          await navigator.mediaDevices.enumerateDevices();
        const videoDevices = availableDevices.filter(
          (i) => i.kind === "videoinput",
        );
        setDevices(videoDevices);

        if (activeDeviceId === "" || activeDeviceId === undefined) {
          setActiveDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        alert(error);
      }
    };

    updateDevices().catch((error) => {
      alert(error);
    });
    const handleDeviceChange = (): void => {
      updateDevices().catch((error) => {
        alert(error);
      });
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [activeDeviceId]);

  useEffect(() => {
    getAzureStorageDir();
  }, [props.uuid]);

  return (
    <BodyContainer width={props.windowSize.width}>
      {saveOpen && (
        <SavePopup
          setSaveOpen={setSaveOpen}
          saveImage={saveImage}
          imageFormat={imageFormat}
          imageLabel={imageLabel}
          setImageFormat={setImageFormat}
          setImageLabel={setImageLabel}
        />
      )}
      {uploadOpen && (
        <UploadPopup setUploadOpen={setUploadOpen} uploadImage={uploadImage} />
      )}
      {switchModelOpen && (
        <SwitchModelPopup
          setSwitchModelOpen={setSwitchModelOpen}
          switchModelOpen={switchModelOpen}
        />
      )}
      {switchDeviceOpen && (
        <SwitchDevice
          setSwitchDeviceOpen={setSwitchDeviceOpen}
          devices={devices}
          setDeviceId={setActiveDeviceId}
          activeDeviceId={activeDeviceId}
        />
      )}
      {delDirectoryOpen && (
        <DeleteDirectoryPopup
          setDelDirectoryOpen={setDelDirectoryOpen}
          delFromDirectory={delFromDirectory}
          curDir={curDir}
        />
      )}
      {createDirectoryOpen && (
        <CreateDirectory
          setCreateDirectoryOpen={setCreateDirectoryOpen}
          handeDirChange={handleDirChange}
          curDir={curDir}
          addToDirectory={addToDirectory}
        />
      )}
      {resultsTunerOpen && (
        <ResultsTunerPopup
          setResultsTunerOpen={setResultsTunerOpen}
          setScoreThreshold={setScoreThreshold}
          scoreThreshold={scoreThreshold}
        />
      )}
      <Classifier
        handleInference={handleInferenceRequest}
        imageIndex={imageIndex}
        setUploadOpen={setUploadOpen}
        imageSrc={imageSrc}
        webcamRef={webcamRef}
        imageFormat={imageFormat}
        setSaveOpen={setSaveOpen}
        capture={captureFeed}
        savedImages={imageCache}
        clearImageCache={clearCache}
        loadImage={loadFromCache}
        canvasRef={canvasRef}
        removeImage={removeFromCache}
        setSwitchModelOpen={setSwitchModelOpen}
        setSwitchDeviceOpen={setSwitchDeviceOpen}
        windowSize={props.windowSize}
        activeDeviceId={activeDeviceId}
        azureStorageDir={azureStorageDir}
        curDir={curDir}
        handleDirChange={handleDirChange}
        setCreateDirectoryOpen={setCreateDirectoryOpen}
        setDelDirectoryOpen={setDelDirectoryOpen}
        setResultsTunerOpen={setResultsTunerOpen}
        scoreThreshold={scoreThreshold}
      />
    </BodyContainer>
  );
};

export default Body;
