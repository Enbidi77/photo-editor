'use client';

import React, { useState } from 'react';
import Konva from 'konva';
import { useUIStore } from '@/store/uiStore';
import { useDocumentStore } from '@/store/documentStore';
import { Exporter } from '@/editor/export/Exporter';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { Download } from 'lucide-react';

interface ExportDialogProps {
  stageRef?: React.RefObject<Konva.Stage | null>;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ stageRef }) => {
  const { activeDialog, closeDialog, showToast } = useUIStore();
  const { document: doc } = useDocumentStore();

  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [filename, setFilename] = useState(doc?.name || 'Untitled-1');
  const [isExporting, setIsExporting] = useState(false);

  const isOpen = activeDialog === 'export';

  const handleExport = async () => {
    let stage = stageRef?.current;
    if (!stage && Konva.stages && Konva.stages.length > 0) {
      stage = Konva.stages[0];
    }

    if (!stage) {
      showToast('Canvas stage not ready for export', 'error');
      return;
    }

    setIsExporting(true);
    try {
      await Exporter.exportStage(stage, {
        format,
        quality: quality / 100,
        pixelRatio: scale,
        filename,
      });
      showToast(`Exported image as ${format.toUpperCase()}`, 'success');
      closeDialog();
    } catch (err) {
      console.error(err);
      showToast('Failed to export image', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const outputW = Math.round((doc?.width || 800) * scale);
  const outputH = Math.round((doc?.height || 600) * scale);

  return (
    <Dialog
      open={isOpen}
      onClose={closeDialog}
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
        Export Image
      </DialogTitle>

      <DialogContent sx={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Filename */}
        <div>
          <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>File Name:</div>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            style={{
              width: '100%',
              height: 24,
              backgroundColor: editorTokens.bg.input,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Format */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', color: editorTokens.text.secondary }}>Format:</span>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            sx={{ width: 120, height: 24, fontSize: '0.72rem' }}
          >
            <MenuItem value="png">PNG (.png)</MenuItem>
            <MenuItem value="jpeg">JPEG (.jpg)</MenuItem>
            <MenuItem value="webp">WEBP (.webp)</MenuItem>
          </Select>
        </div>

        {/* Quality (JPEG & WEBP) */}
        {format !== 'png' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: editorTokens.text.secondary }}>
              <span>Quality:</span>
              <span>{quality}%</span>
            </div>
            <Slider
              value={quality}
              min={10}
              max={100}
              onChange={(_, val) => setQuality(val as number)}
            />
          </div>
        )}

        {/* Scale Multiplier */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', color: editorTokens.text.secondary }}>Scale:</span>
          <Select
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            sx={{ width: 120, height: 24, fontSize: '0.72rem' }}
          >
            <MenuItem value={0.5}>0.5× (Half)</MenuItem>
            <MenuItem value={1}>1× (Original)</MenuItem>
            <MenuItem value={2}>2× (Double / Retina)</MenuItem>
            <MenuItem value={4}>4× (Ultra HD)</MenuItem>
          </Select>
        </div>

        {/* Output Resolution Info */}
        <div
          style={{
            padding: '8px',
            backgroundColor: editorTokens.bg.panel,
            border: `1px solid ${editorTokens.border.subtle}`,
            borderRadius: 2,
            fontSize: '0.68rem',
            color: editorTokens.text.secondary,
          }}
        >
          Export Dimensions: <strong style={{ color: '#ffffff' }}>{outputW} × {outputH} px</strong>
        </div>
      </DialogContent>

      <DialogActions sx={{ padding: '8px 16px', borderTop: `1px solid ${editorTokens.border.subtle}` }}>
        <Button onClick={closeDialog} sx={{ color: editorTokens.text.secondary, fontSize: '0.72rem' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExport}
          disabled={isExporting}
          startIcon={<Download size={14} />}
          sx={{ fontSize: '0.72rem' }}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
