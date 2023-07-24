import React from "react";
import { Overlay, ButtonWrap, InfoContainer } from "./indexElements";
import {
  Box,
  CardHeader,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Select,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import CloseIcon from "@mui/icons-material/Close";
import { colours } from "../../../styles/colours";

interface params {
  setSaveOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  saveImage?: () => void;
  imageFormat?: string;
  imageLabel?: string;
  setImageFormat?: React.Dispatch<React.SetStateAction<string>>;
  setImageLabel?: React.Dispatch<React.SetStateAction<string>>;
}

const SavePopup: React.FC<params> = (props): JSX.Element => {
  const handleClose = (): void => {
    if (props.setSaveOpen === undefined) {
      return;
    }
    props.setSaveOpen(false);
  };

  const handleFormat = (event: SelectChangeEvent): void => {
    if (props.setImageFormat === undefined) {
      return;
    }
    props.setImageFormat(event.target.value);
  };

  const handleLabel = (event: any): void => {
    if (props.setImageLabel === undefined) {
      return;
    }
    props.setImageLabel(event.target.value);
  };

  return (
    <Overlay>
      <Box
        sx={{
          width: 400,
          height: 300,
          zIndex: 30,
          border: 1,
          borderRadius: 1,
          background: colours.CFIA_Background_White,
        }}
      >
        <CardHeader
          title="Save Capture"
          titleTypographyProps={{
            variant: "h6",
            align: "left",
            fontWeight: 600,
            fontSize: "1.3vh",
            color: colours.CFIA_Font_Black,
            zIndex: 30,
          }}
          action={
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          }
          sx={{
            paddingBottom: 0,
          }}
        />
        <InfoContainer>
          <TextField
            id="outlined-basic"
            label="Capture Name"
            variant="outlined"
            onChange={handleLabel}
            value={props.imageLabel}
            size="small"
          />
          <Select
            value={props.imageFormat}
            onChange={handleFormat}
            placeholder="Capture Format"
            sx={{ width: "100%", marginTop: "1rem" }}
            size="small"
          >
            <MenuItem value="image/png">PNG</MenuItem>
            <MenuItem value="image/jpeg">JPEG</MenuItem>
          </Select>
        </InfoContainer>
        <ButtonWrap>
          <Button
            variant="outlined"
            size="medium"
            sx={{
              alignContent: "center",
              alignItems: "center",
              paddingLeft: 4,
              paddingRight: 4,
              fontSize: "1.1vh",
              color: colours.CFIA_Font_Black,
              borderColor: colours.CFIA_Font_Black,
            }}
            onClick={props.saveImage}
          >
            SAVE
          </Button>
        </ButtonWrap>
      </Box>
    </Overlay>
  );
};

export default SavePopup;