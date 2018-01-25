
/* NOTE: FMRs should be 3D Motion Corrected and OPE Undistorted */

// Variables
var mainDir = BrainVoyagerQX.BrowseDirectory("Select Subject Directory");
var processSteps = "_3DMCTS_undist"; // processed steps

 //  Regular Expression Patterns
var functionalPattern = "Loc\\d+|Set\\d+"; // functional scan pattern (localizer and set)
var re = new RegExp(functionalPattern); // functional scan pattern regular expression
var processRE = new RegExp(processSteps + ".fmr"); // processing steps regular expression

// Directories for FMR Pre-Processing
var dir = new QDir(mainDir); // search main directory
var filter = new QDir.Filters(QDir.Dirs); // keep only directories
var subDir = dir.entryList(filter); // filter

var processDir = []; // initialize array
for (var i = 0; i < subDir.length; i++) {
	if (re.test(subDir[i])) { 
		processDir.push(subDir[i]);
	 }
} 

// Locate FMRs to Slice Time Correct and Temporal High Pass Filter
var fileFilter = new QDir.Filters(QDir.Files); // keep only files
for (var i = 0; i < processDir.length; i++) {
	var fmrDir = mainDir + "/" + processDir[i];
	var dir = new QDir(fmrDir); // search FMR directory
	var fileList = dir.entryList(fileFilter); // filter for files 
	for (var i2 = 0; i2 < fileList.length; i2++) { // loop through the files in directory to find FMR file
		if (processRE.test(fileList[i2])) { var fmrPath = fileList[i2]; } // remove PAR file from fileList
	}
	var fmr = BrainVoyagerQX.OpenDocument(fmrDir + "/" + fmrPath); 
	fmr.CorrectSliceTiming(1, 1); // slice scan ordering: ascending-interleaved (1), interpolation: cubic spline (1)
	var resultFile = fmr.FileNameOfPreprocessdFMR; // slice time corrected FMR processed name
	BrainVoyagerQX.PrintToLog(resultFile);
	fmr.Close(); // close FMR project
	var fmr = BrainVoyagerQX.OpenDocument(resultFile); // open slice time corrected FMR 
	fmr.TemporalHighPassFilterGLMFourier(2); // (2) numbers of cycles used as cutoff
	fmr.Close(); // close FMR project
} 
BrainVoyagerQX.PrintToLog("COMPLETED: Slice Time Correction and Temporal Filtering!")