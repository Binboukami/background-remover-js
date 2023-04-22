export default class BackgroundRemover
{
	constructor(source)
	{
    this.channelMask = Object.freeze({ red: 0, green: 1, blue: 2, alpha: 3 })
		this.src = source
		this.url = null
	}

	async setBackgroundBasedOnForegroundColor()
	{
		const image = this._createImageElement()

		const canvas = this._createCanvasElement()

		/** @type CanvasRenderingContext2D */
		const context = canvas.getContext('2d', { willReadFrequently: true })

		return new Promise((resolve) => {

			image.addEventListener('load', () => {
  
				this._scaleToFitCanvas(canvas, context, image)
  
				/** When image gets here it sometime hasnt loaded, causing the scale
         *  variable to return 'Infinity', rendering the canvas useless */
  
				const updatedImageData = this._updateBackgroundColorBasedOnImageColor(context)
          
				context.putImageData(updatedImageData, 0, 0)
      
				this.url = canvas.toDataURL()
      
				image.remove()
				canvas.remove()

				resolve()
			})
		})
	}

	async get()
	{
		return this.url
	}

	//#region Private methods

	/**
   * @todo Fix canvas resizing to improve image quality
   * @returns {HTMLCanvasElement} */
	_createCanvasElement(width = 64, height = 64)
	{
		const canvas = document.createElement('canvas')
		canvas.setAttribute('width', width)
		canvas.setAttribute('height', height)

		return canvas
	}

	_createImageElement()
	{
		const image = document.createElement('img')

		image.setAttribute('crossorigin', 'anonymous')
		image.setAttribute('src', this.src)

		return image
	}

	/**
   * 
   * @param {HTMLCanvasElement} canvas 
   * @param {CanvasRenderingContext2D} ctx 
   * @param {HTMLImageElement} img 
   */
	_scaleToFitCanvas(canvas, ctx, img)
	{
		let factor  = Math.min ( canvas.width / img.width, canvas.height / img.height )

		ctx.scale(factor, factor)
		ctx.drawImage(img, 0, 0)
		ctx.scale(1 / factor, 1 / factor)
	}

	/**
   * @param {ImageDataContext} imageData 
   * @returns {Number}
   */
	_averageImageColorBrightness(imageData)
	{
		let channels = { r: 0, g: 0, b: 0 }
		const length = imageData.length

		for(let i = 0; i < length; i += 4)
		{
			channels.r += imageData.at(i)
			channels.g += imageData.at(i + 1)
			channels.b += imageData.at(i + 2)
		}

		/** @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_NOT */
		const numOfPixels = length / 4

		const channelSum = ~~((channels.r + channels.g + channels.b) / numOfPixels)

		return channelSum
	}

	/**
   * @param {CanvasRenderingContext2D} canvasContext
   * @return {ImageDataContext}
   */
	_updateBackgroundColorBasedOnImageColor(canvasContext)
	{
		/** @todo check for null image data */
		const ImageDataContext = canvasContext.getImageData(0, 0, 64, 64)

		const { data, data: { length } } = ImageDataContext

		const channelSum = this._averageImageColorBrightness(data)

		const colorMap = { 'black': [0, 0, 0, 255], 'white': [255, 255, 255, 255] }
    
		const colorToSet = channelSum > 50 ? 'black' : 'white'

		/** If the pixel rgb channels are not set, change its alpha */
		for(let i = 0; i < length; i += 4)
		{
			/** Alpha channel */
			if(this._pixelIsTransparent(data.slice(i, i + 4), 32))
			{
				this._setRGBAColors(data, i, colorMap[colorToSet])
			}
		}

		return ImageDataContext
	}

	_setRGBAColors(data, pixelPointer, rgbaColorArray)
	{ 
		/** Sums channel offset */
		data[pixelPointer + channelMask.red] = rgbaColorArray.at(channelMask.red)
		data[pixelPointer + channelMask.green] = rgbaColorArray.at(channelMask.green)
		data[pixelPointer + channelMask.blue] = rgbaColorArray.at(channelMask.blue)
		data[pixelPointer + channelMask.alpha] = rgbaColorArray.at(channelMask.alpha)
	}

	_pixelIsTransparent(pixel, threshold = 8)
	{
		return pixel.at(3) < threshold
		// return (pixel.at(0) < threshold && pixel.at(1) < threshold && pixel.at(2) < threshold && pixel.at(3) === 0)
	}

	//#endregion
}
