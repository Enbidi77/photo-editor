'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { ImageLayer, ImageAdjustments } from '@/types/layer';
import { ApplyAdjustmentsCommand } from '@/editor/commands/FilterCommands';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';

export const AdjustmentsDialog: React.FC = () => {
  const { activeDialog, closeDialog, showToast } = useUIStore();
  const { layers, activeLayerId, updateLayer } = useLayerStore();
  const { executeCommand } = useHistoryStore();

  const isOpen = activeDialog === 'adjustments';
  const activeLayer = layers.find((l) => l.id === activeLayerId && l.type === 'IMAGE') as ImageLayer | undefined;

  const [initialAdjustments, setInitialAdjustments] = useState<ImageAdjustments | null>(null);
  const [currentAdjustments, setCurrentAdjustments] = useState<ImageAdjustments | null>(null);

  useEffect(() => {
    if (activeLayer && isOpen) {
      const copy = { ...activeLayer.adjustments };
      setInitialAdjustments(copy);
      setCurrentAdjustments(copy);
    }
  }, [isOpen, activeLayer?.id]);

  if (!isOpen || !activeLayer || !currentAdjustments || !initialAdjustments) return null;

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    const next = { ...currentAdjustments, [key]: value };
    setCurrentAdjustments(next);
    updateLayer(activeLayer.id, { adjustments: next });
  };

  const handleCommit = () => {
    const cmd = new ApplyAdjustmentsCommand(
      activeLayer.id,
      initialAdjustments,
      currentAdjustments,
      'Adjust Tonal Balance'
    );
    executeCommand(cmd);
    closeDialog();
    showToast('Tonal adjustments applied', 'success');
  };

  const handleCancel = () => {
    updateLayer(activeLayer.id, { adjustments: initialAdjustments });
    closeDialog();
  };

  const rowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  };

  const labelSx = {
    fontSize: '0.7rem',
    color: editorTokens.text.secondary,
    width: 70,
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
        Image Adjustments
      </DialogTitle>

      <DialogContent sx={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Brightness */}
        <div style={rowSx}>
          <span style={labelSx}>Brightness:</span>
          <Slider
            value={Math.round(currentAdjustments.brightness * 100)}
            min={-100}
            max={100}
            onChange={(_, v) => handleSliderChange('brightness', (v as number) / 100)}
            sx={{ flex: 1 }}
          />
          <span style={{ width: 32, textAlign: 'right', fontSize: '0.7rem' }}>
            {Math.round(currentAdjustments.brightness * 100)}
          </span>
        </div>

        {/* Contrast */}
        <div style={rowSx}>
          <span style={labelSx}>Contrast:</span>
          <Slider
            value={currentAdjustments.contrast}
            min={-100}
            max={100}
            onChange={(_, v) => handleSliderChange('contrast', v as number)}
            sx={{ flex: 1 }}
          />
          <span style={{ width: 32, textAlign: 'right', fontSize: '0.7rem' }}>
            {currentAdjustments.contrast}
          </span>
        </div>

        {/* Saturation */}
        <div style={rowSx}>
          <span style={labelSx}>Saturation:</span>
          <Slider
            value={currentAdjustments.saturation}
            min={-100}
            max={100}
            onChange={(_, v) => handleSliderChange('saturation', v as number)}
            sx={{ flex: 1 }}
          />
          <span style={{ width: 32, textAlign: 'right', fontSize: '0.7rem' }}>
            {currentAdjustments.saturation}
          </span>
        </div>

        {/* Exposure */}
        <div style={rowSx}>
          <span style={labelSx}>Exposure:</span>
          <Slider
            value={currentAdjustments.exposure}
            min={-100}
            max={100}
            onChange={(_, v) => handleSliderChange('exposure', v as number)}
            sx={{ flex: 1 }}
          />
          <span style={{ width: 32, textAlign: 'right', fontSize: '0.7rem' }}>
            {currentAdjustments.exposure}
          </span>
        </div>
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
