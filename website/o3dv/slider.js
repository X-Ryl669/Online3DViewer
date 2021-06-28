OV.Slider = class
{
    constructor (minRange, maxRange, onChange)
    {
        this.minRange = minRange;
        this.maxRange = maxRange;
        this.onChange = onChange;
        this.buttonDiv = null;
        this.buttonThumb = null;
    }

    CreateDomElement (parentDiv)
    {
        this.buttonDiv = $('<div>').addClass ('ov_toolbar_slider_div').appendTo (parentDiv);
        this.buttonThumb = $('<input type="range" min="'+ this.minRange + '" max="'+ this.maxRange + '">').addClass ('ov_toolbar_slider').appendTo (this.buttonDiv);
        if (this.onChange !== null) {
            let self = this;
            this.buttonThumb.on('input', function(e) { if (self.onChange !== null) self.onChange(Number.parseFloat(e.target.value)); } );
        }
        this.Update ();
    }

    AddClass (className)
    {
        this.buttonDiv.addClass (className);
    }

    Update ()
    {
        if (!this.selected) {
            this.buttonDiv.removeClass ('selected');
        } else {
            this.buttonDiv.addClass ('selected');
        }
    }

    Select (isSelected)
    {
        this.selected = isSelected;
        this.Update ();
    }

    Dispose ()
    {
        this.buttonThumb.remove ();
        this.buttonDiv.remove ();
    }
};
