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

  useEffect(() => {
    if (activeLayer) {
      setInitialAdjustments({ ...activeLayer.adjustments });
      if (activeFilterType === 'blur') setParamValue(10);
      else if (activeFilterType === 'noise') setParamValue(20);
      else if (activeFilterType === 'pixelate') setParamValue(8);
      else setParamValue(1);
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
    } else if (activeFilterType === 'grayscale') {
      next.grayscale = true;
    } else if (activeFilterType === 'invert') {
      next.invert = true;
    } else if (activeFilterType === 'sepia') {
      next.sepia = true;
    }

    updateLayer(activeLayer.id, { adjustments: next });
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
