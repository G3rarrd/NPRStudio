

export class Slider {
    public readonly name : string;
    public min : number = 0;
    public max : number = 100;
    public step : number = 1;
    public value : number = 0;


    constructor(name : string) {
        if (! name) throw new Error("Slider name is required");
        this.name = name;
    }
}

class SliderBuilder {
    private _min : number = 0;
    private _max : number = 1;
    private _step : number = 0.1;
    private _value : number = 0.5;
    private _name : string;
    constructor (name : string) {
        this._name  = name;
    }

    public min(value : number) : this {
        this._min = value;
        return this;
    }
    public max(value : number) : this {
        this._max = value;
        return this;
    }
    public step(value : number) : this {
        this._step = value;
        return this;
    }
    public value(val : number) : this {
        this._value = val;
        return this;
    }
    
    public build() : Slider {
        const slider : Slider = new Slider(this._name);
        slider.max = this._max;
        slider.min = this._min;
        slider.value = this._value;
        slider.step = this._step;
        return  slider;
    }
}


export default SliderBuilder;