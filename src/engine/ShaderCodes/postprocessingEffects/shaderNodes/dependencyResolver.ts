class DependencyResolver {
    public totalDependantCount : number = 0;
    private dependencyUsedCount : number = 0;

    constructor () {

    }

    private incrementDependecyUseCount () : void {
        this.dependencyUsedCount++;
        this.dependencyUsedCount = Math.min(this.dependencyUsedCount, this.totalDependantCount);
    }

    public isResolved() : boolean{
        this.incrementDependecyUseCount();
        const equal : boolean = this.totalDependantCount === this.dependencyUsedCount;
        if (equal) this.dependencyUsedCount = 0;
        return equal;
    }
}

export default DependencyResolver;