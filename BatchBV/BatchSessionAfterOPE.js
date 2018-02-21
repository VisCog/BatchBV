
// Assumes that "BatchSession.js" and OPE distortion correction (COPE) was performed before calling this script

// Variables
var anatDir = "3DAnat";
var fmrCoregDir = "fmrCoreg";
var opeDir = "OPE"; 
var vtcSpace = "TAL"; // "ACPC" or "TAL"
var withinSession = true; // within session VTC creation, boolean

// Processing -------------------------------------------------------------------------------------------------------------------

// Directories
var mainDir = BrainVoyagerQX.BrowseDirectory("Select Session Directory");
var projectName = mainDir.split("/").pop();
var fmrCoregPath = mainDir + "/" + fmrCoregDir + "/" + projectName + "_" + fmrCoregDir + ".fmr";
var vmrBase = mainDir + "/" + anatDir + "/" + projectName + "_MPRAGE_IIHC_ISO_SAG";

// Location TRF and TAL File (if NOT within session VTC creation)
if (!withinSession) {
	var acpcPath = findExtraSessionTRF(mainDir + "/" + anatDir);
	if (/TAL/i.test(vtcSpace)) {
		var talPath = BrainVoyagerQX.BrowseFile("Select TAL File", "*.tal");
	}
}

// Locate FMR Directories
var fmrDirs = findFMRDirs(mainDir, anatDir);

// Remove fmrCoreg Directory and OPE Directory (if exist)
fmrDirs.splice(fmrDirs.indexOf(fmrCoregDir), 1); // remove fmrCoreg directory
fmrDirs.splice(fmrDirs.indexOf(opeDir), 1); // remove ope directory

// FMR Motion Correction Preprocessing
for (var i = 0; i < fmrDirs.length; i++) {	
	var fmrDir = mainDir + "/" + fmrDirs[i];
	var fmrPath = findOPEUndist(fmrDir);
	fmrPath = SCCAI(fmrPath);
	fmrPath = LTR_THPGLMF2c(fmrPath);
	createVTC(fmrPath, vmrBase, fmrCoregDir, acpcPath, talPath, vtcSpace);
}

// Helper Functions ------------------------------------------------------------------------------------------------------------

// SCCAI: FMR preprocessing, slice scan time correction 
function SCCAI(fmrPath) {
	var fmr = BrainVoyagerQX.OpenDocument(fmrPath);
	fmr.CorrectSliceTiming(1, 1); // slice scan ordering: ascending-interleaved (1), interpolation: cubic spline (1)
	var resultsName  = fmr.FileNameOfPreprocessdFMR;
	fmr.Close(); // close FMR
	return resultsName;
}

// LTR_THPGLMF2c: FMR preprocessing, linear trend removal and temporal high pass filtering
// with GLM and Fourier at 2 cycles
function LTR_THPGLMF2c(fmrPath) {
	var fmr = BrainVoyagerQX.OpenDocument(fmrPath);
	fmr.TemporalHighPassFilterGLMFourier(2); // (2) numbers of cycles used as cutoff
	var resultsName  = fmr.FileNameOfPreprocessdFMR;
	fmr.Close(); // close FMR project
	return resultsName;
}

// createVTC: create VTC either in ACPC or TAL space
function createVTC(fmrPath, vmrBase, fmrCoregDir, acpcPath, talPath, vtcSpace) {
	var projectName = mainDir.split("/").pop();
	var fmrCoregName = projectName + "_" + fmrCoregDir;
	var vmrName = vmrBase.split("/").splice(-1);
	var iaPath = mainDir + "/" + fmrCoregDir + "/" + fmrCoregName + "-TO-" + vmrName + "_IA.trf"; // initial alignment 
	var faPath = mainDir + "/" + fmrCoregDir + "/" + fmrCoregName + "-TO-" + vmrName + "_FA.trf"; // fine alignment
	if (!acpcPath) {
		var acpcPath = vmrBase + "_aACPC.trf"; // acpc transformation file
	}
	if (!talPath) {
		var talPath = vmrBase + "_aACPC.tal"; // tal transformation file
	}	

	var vmr = BrainVoyagerQX.OpenDocument(vmrBase + ".vmr"); // open base VMR
	vmr.ExtendedTALSpaceForVTCCreation = false; // turn off arbitrary sized tal bounding box
	if (/ACPC/i.test(vtcSpace)) { // VTC in ACPC space
		var savePath = fmrPath.replace(".fmr", "_aACPC.vtc");
		vmr.CreateVTCInACPCSpace(fmrPath, iaPath, faPath, acpcPath, savePath, 2, 3, 1, 100);
		// last numerical parameters - data type: float (2), resolution: 3x3x3 (3), interpolation: trilinear (1),
		// threshold intensity: 100 (default)
	} else { // VTC in TAL space'
		var savePath = fmrPath.replace(".fmr", "_aTAL.vtc");
		vmr.CreateVTCInTALSpace(fmrPath, iaPath, faPath, acpcPath, talPath, savePath, 2, 3, 1, 100);
		// last numerical parameters - data type: float (2), resolution: 3x3x3 (3), interpolation: trilinear (1),
		// threshold intensity: 100 (default)
	}
	vmr.Close(); // close VMR
}

// findOPEUndist: locate the OPE distortion corrected FMR files (i.e., *_undist.fmr)
function findOPEUndist(fmrDir) {
	var dir = new QDir(fmrDir); // search functional directory
	var fileFilter = new QDir.Filters(QDir.Files); // keep only files
	var fileList = dir.entryList(fileFilter); // filter for files 
	for (var i = 0; i < fileList.length; i++) {
		if (/_undist.fmr/.test(fileList[i])) {
			return fmrDir + "/" + fileList[i];
		} 	
	}
	return "";
}

// findExtraSessionTRF: locate the VMR-VMR coregistration TRF file
function findExtraSessionTRF(anatDir) {
	var dir = new QDir(anatDir); // search anatomical directory
	var fileFilter = new QDir.Filters(QDir.Files); // keep only files
	var fileList = dir.entryList(fileFilter); // filter for files 	
	for (var i = 0; i < fileList.length; i++) {
		if (/.*-TO-.*.trf/.test(fileList[i])) {
			return anatDir + "/" + fileList[i];
		} 	
	}
	return "";
}

// findFMRDirs: locates the functional dictories within a given subject session folder
function findFMRDirs(mainDir, anatDir) {
	var dir = new QDir(mainDir); // search main directory
	var filter = new QDir.Filters(QDir.Dirs); // keep only directories
	var fmrDirs = dir.entryList(filter); // filter to keep only directories
	fmrDirs.splice(fmrDirs.indexOf("."), 1); // removes "." directory
      fmrDirs.splice(fmrDirs.indexOf(".."), 1); // removes ".." directory
	fmrDirs.splice(fmrDirs.indexOf(anatDir), 1); // remove anatomical directory
	return fmrDirs;
}