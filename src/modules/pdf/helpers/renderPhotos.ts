import axios from "axios";

export const renderPhotos = async (
  doc: any,
  photos: any[]
) => {

  for (const photo of photos || []) {

    try {

      const response =
        await axios.get(photo.url, {
          responseType: "arraybuffer"
        });

      const buffer =
        Buffer.from(response.data);

      doc.image(
        buffer,
        {
          fit: [200, 150],
          align: "left"
        }
      );

      doc.moveDown();

    } catch (e) {

      doc.text(
        `Unable to load image`
      );
    }
  }
};