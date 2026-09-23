'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { ImageLayer } from '@/types/layer';
import { ApplyAdjustmentsCommand } from '@/editor/commands/FilterCommands';
import { AVAILABLE_FILTERS } from '@/types/filters';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';

export const FiltersDialog: React.FC = () => {
  const { activeDialog, activeFilterType, closeDialog, showToast } = useUIStore();
  const { layers, activeLayerId, updateLayer } = useLayerStore();
  const { executeCommand } = useHistoryStore();

  const isOpen = activeDialog === 'filters' && activeFilterType !== null;
  const activeLayer = layers.find((l) => l.id === activeLayerId && l.type === 'IMAGE') as ImageLayer | undefined;

  const [initialAdjustments, setInitialAdjustments] = useState(activeLayer?.adjustments);
  const [paramValue, setParamValue] = useState(10);

  // Vignette state
  const [vignetteAmount, setVignetteAmount] = useState(50);
  const [vignetteMidpoint, setVignetteMidpoint] = useState(50);
  const [vignetteRoundness, setVignetteRoundness] = useState(50);

  // Chromatic Aberration state
  const [chromaticShift, setChromaticShift] = useState(10);
  const [chromaticDirection, setChromaticDirection] = useState(0);

  useEffect(() => {
    if (activeLayer && isOpen) {
      const orig = { ...activeLayer.adjustments };
      setInitialAdjustments(orig);

      if (activeFilterType === 'blur') {
        const val = 10;
        setParamValue(val);
        updateLayer(activeLayer.id, { adjustments: { ...orig, blur: val } });
      } else if (activeFilterType === 'noise') {
        const val = 20;
        setParamValue(val);
        updateLayer(activeLayer.id, { adjustments: { ...orig, noise: val / 100 } });
      } else if (activeFilterType === 'pixelate') {
        const val = 8;
        setParamValue(val);
        updateLayer(activeLayer.id, { adjustments: { ...orig, pixelate: val } });
      } else if (activeFilterType === 'vignette') {
        const amt = orig.vignetteAmount > 0 ? orig.vignetteAmount : 50;
        const mid = orig.vignetteMidpoint ?? 50;
        const rnd = orig.vignetteRoundness ?? 50;
        setVignetteAmount(amt);
        setVignetteMidpoint(mid);
        setVignetteRoundness(rnd);
        updateLayer(activeLayer.id, {
          adjustments: {
            ...orig,
            vignetteAmount: amt,
            vignetteMidpoint: mid,
            vignetteRoundness: rnd,
          },
        });
      } else if (activeFilterType === 'chromatic-aberration') {
        const shift = orig.chromaticShift > 0 ? orig.chromaticShift : 10;
        const dir = orig.chromaticDirection ?? 0;
        setChromaticShift(shift);
        setChromaticDirection(dir);
        updateLayer(activeLayer.id, {
          adjustments: {
            ...orig,
            chromaticShift: shift,
            chromaticDirection: dir,
          },
        });
      } else if (activeFilterType === 'grayscale') {
        updateLayer(activeLayer.id, { adjustments: { ...orig, grayscale: true } });
      } else if (activeFilterType === 'invert') {
        updateLayer(activeLayer.id, { adjustments: { ...orig, invert: true } });
      } else if (activeFilterType === 'sepia') {
        updateLayer(activeLayer.id, { adjustments: { ...orig, sepia: true } });
      }
    }
  }, [isOpen, activeFilterType]);

  if (!isOpen || !activeLayer || !initialAdjustments) return null;

  const currentFilterDef = AVAILABLE_FILTERS.find((f) => f.id === activeFilterType);

  const handleApplyPreview = (val: number) => {
    setParamValue(val);
    const next = { ...initialAdjustments };

    if (activeFilterType === 'blur') {
      next.blur = val;
    } else if (activeFilterType === 'noise') {
      next.noise = val / 100;
    } else if (activeFilterType === 'pixelate') {
      next.pixelate = val;
    }

    updateLayer(activeLayer.id, { adjustments: next });
  };

  const handleVignetteChange = (amt: number, mid: number, rnd: number) => {
    setVignetteAmount(amt);
    setVignetteMidpoint(mid);
    setVignetteRoundness(rnd);
    if (!initialAdjustments) return;
    updateLayer(activeLayer.id, {
      adjustments: {
        ...initialAdjustments,
        vignetteAmount: amt,
        vignetteMidpoint: mid,
        vignetteRoundness: rnd,
      },
    });
  };

  const handleChromaticChange = (shift: number, dir: number) => {
    setChromaticShift(shift);
    setChromaticDirection(dir);
    if (!initialAdjustments) return;
    updateLayer(activeLayer.id, {
      adjustments: {
        ...initialAdjustments,
        chromaticShift: shift,
        chromaticDirection: dir,
      },
    });
  };

  const handleCommit = () => {
    const finalAdjustments = activeLayer.adjustments;
    const cmd = new ApplyAdjustmentsCommand(
      activeLayer.id,
      initialAdjustments,
      finalAdjustments,
      `Filter: ${currentFilterDef?.name || 'Effect'}`
    );
    executeCommand(cmd);
    closeDialog();
    showToast(`Applied ${currentFilterDef?.name}`, 'success');
  };

  const handleCancel = () => {
    updateLayer(activeLayer.id, { adjustments: initialAdjustments });
    closeDialog();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: editorTokens.bg.surface,
          border: `1px solid ${editorTokens.border.medium}`,
          color: editorTokens.text.primary,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '0.85rem',
          fontWeight: 700,
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          padding: '10px 16px',
        }}
      >
        {currentFilterDef?.name || 'Filter'}
      </DialogTitle>

      <DialogContent sx={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary }}>
          {currentFilterDef?.description}
        </div>

        {/* Blur slider */}
        {activeFilterType === 'blur' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
              <span>Radius:</span>
              <span>{paramValue} px</span>
            </div>
            <Slider
              value={paramValue}
              min={1}
              max={40}
              onChange={(_, v) => handleApplyPreview(v as number)}
            />
          </div>
        )}

        {/* Noise slider */}
        {activeFilterType === 'noise' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
              <span>Amount:</span>
              <span>{paramValue}%</span>
            </div>
            <Slider
              value={paramValue}
              min={1}
              max={100}
              onChange={(_, v) => handleApplyPreview(v as number)}
            />
          </div>
        )}

        {/* Pixelate slider */}
        {activeFilterType === 'pixelate' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
              <span>Block Size:</span>
              <span>{paramValue} px</span>
            </div>
            <Slider
              value={paramValue}
              min={2}
              max={30}
              step={2}
              onChange={(_, v) => handleApplyPreview(v as number)}
            />
          </div>
        )}

        {/* Vignette sliders */}
        {activeFilterType === 'vignette' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
                <span>Amount:</span>
                <span>{vignetteAmount}%</span>
              </div>
              <Slider
                value={vignetteAmount}
                min={0}
                max={100}
                onChange={(_, v) => handleVignetteChange(v as number, vignetteMidpoint, vignetteRoundness)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
                <span>Midpoint:</span>
                <span>{vignetteMidpoint}%</span>
              </div>
              <Slider
                value={vignetteMidpoint}
                min={0}
                max={100}
                onChange={(_, v) => handleVignetteChange(vignetteAmount, v as number, vignetteRoundness)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
                <span>Roundness:</span>
                <span>{vignetteRoundness}%</span>
              </div>
              <Slider
                value={vignetteRoundness}
                min={0}
                max={100}
                onChange={(_, v) => handleVignetteChange(vignetteAmount, vignetteMidpoint, v as number)}
              />
            </div>
          </div>
        )}

        {/* Chromatic Aberration sliders */}
        {activeFilterType === 'chromatic-aberration' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
                <span>Shift Amount:</span>
                <span>{chromaticShift} px</span>
              </div>
              <Slider
                value={chromaticShift}
                min={0}
                max={50}
                onChange={(_, v) => handleChromaticChange(v as number, chromaticDirection)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
                <span>Direction:</span>
                <span>{chromaticDirection}°</span>
              </div>
              <Slider
                value={chromaticDirection}
                min={0}
                max={360}
                step={5}
                onChange={(_, v) => handleChromaticChange(chromaticShift, v as number)}
              />
            </div>
          </div>
        )}

        {(activeFilterType === 'grayscale' ||
          activeFilterType === 'invert' ||
          activeFilterType === 'sepia') && (
          <div style={{ fontSize: '0.75rem', color: editorTokens.text.primary, padding: '8px 0' }}>
            Click OK to apply this color grading filter to "{activeLayer.name}".
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '8px 16px', borderTop: `1px solid ${editorTokens.border.subtle}` }}>
        <Button onClick={handleCancel} sx={{ color: editorTokens.text.secondary, fontSize: '0.72rem' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleCommit} sx={{ fontSize: '0.72rem' }}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};
