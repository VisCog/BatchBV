# Batch BrainVoyagerQX JavaScripts

A bunch of JavaScripts written for batch processing in BrainVoyagerQX

---

[BatchFMR-3DMC.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchFMR-3DMC.js)
- Creates new FMR Projects
- 3D Motion Correction (3DMC; aligned to a coregistration scan)

[BatchSCCAI-LTR-THPGLMF2c.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchSCCAI-LTR-THPGLMF2c.js)
- Slice Scan Time Correction (SCCAI)
- Linear Tread Removal (LTR)
- Temporal High Pass Filtering with GLM, Fourier 2 Cycles (THPGLMF2c)

[BatchSession.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchSession.js)
- Anatomical Pre-Processing:
1. Create VMR
2. Intensity Inhomogeneity Correction (IIHC)
3. Iso-voxel Transformation (ISO)
4. Sagittal Reorientation Transformation (SAG)
5. ACPC and TAL Transformation (aACPC and aTAL)
- Functional Pre-Processing:
1. Create FMRs
2. 3D Motion Correction (3DMCTS)
3. (STOPS, if OPE refer to [BatchSessionAfterOPE.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchSessionAfterOPE.js) after OPE distortion correction)
4. Slice Scan Time Correction (SCCAI)
5. Linear Tread Removal (LTR)
6. Temporal High Pass Filtering with GLM, Fourier 2 Cycles (THPGLMF2c)
7. Creates VTCs (ACPC or TAL)

[BatchSessionAfterOPE.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchSessionAfterOPE.js)
- Continues where [BatchSession.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchSession.js) stops after OPE distortion correction
- It is possible to specify
4. Slice Scan Time Correction (SCCAI)
5. Linear Tread Removal (LTR)
6. Temporal High Pass Filtering with GLM, Fourier 2 Cycles (THPGLMF2c)
7. Creates VTCs (ACPC or TAL)

[BatchVTC.js](https://github.com/VisCog/BatchBV/blob/master/BatchBV/BatchVTC.js)
- Create VTCs (Voxel Time Course)

--- 

# Contributor(s)

Kelly Chang - @kellychang4 - kchang4@uw.edu
