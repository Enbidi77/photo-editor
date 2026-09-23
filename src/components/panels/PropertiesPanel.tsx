'use client';

import React from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { Layer, ImageLayer, TextLayer, ShapeLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { UpdateLayerPropertiesCommand } from '@/editor/commands/LayerCommands';
import { editorTokens } from '@/theme/palette';
import {
  GRADIENT_PRESETS,
  GradientType,
  ShapeGradientConfig,
  formatCssGradient,
  resolveGradientStops,
} from '@/lib/image/gradient';
import { useToolStore } from '@/store/toolStore';
import Slider from '@mui/material/Slider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

export const PropertiesPanel: React.FC = () => {
  const { document: doc, updateDocument } = useDocumentStore();
  const { layers, activeLayerId, updateLayer } = useLayerStore();
  const { executeCommand } = useHistoryStore();
  const { foregroundColor, backgroundColor } = useToolStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const handleUpdate = (patch: Partial<Layer>, label = 'Update Properties') => {
    if (!activeLayer) return;
    const cmd = new UpdateLayerPropertiesCommand(activeLayer.id, activeLayer, { ...activeLayer, ...patch }, label);
    executeCommand(cmd);
  };

  const sectionHeaderSx = {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    color: editorTokens.text.secondary,
    letterSpacing: '0.04em',
    marginBottom: 8,
  };

  const rowSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  };

  const labelSx = {
    fontSize: '0.7rem',
    color: editorTokens.text.secondary,
    minWidth: 50,
  };

  const inputNumberSx = {
    width: 60,
    height: 22,
    backgroundColor: editorTokens.bg.input,
    border: `1px solid ${editorTokens.border.subtle}`,
    color: editorTokens.text.primary,
    fontSize: '0.72rem',
    padding: '1px 6px',
    borderRadius: 2,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: editorTokens.bg.panel,
        padding: '12px 10px',
        overflowY: 'auto',
        fontSize: '0.72rem',
        userSelect: 'none',
      }}
    >
      {/* NO LAYER SELECTED: DOCUMENT PROPERTIES */}
      {!activeLayer && doc && (
        <div>
          <div style={sectionHeaderSx}>Document Properties</div>

          <div style={rowSx}>
            <span style={labelSx}>Name:</span>
            <input
              type="text"
              value={doc.name}
              onChange={(e) => updateDocument({ name: e.target.value })}
              style={{
                flex: 1,
                height: 22,
                backgroundColor: editorTokens.bg.input,
                border: `1px solid ${editorTokens.border.subtle}`,
                color: editorTokens.text.primary,
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: 2,
              }}
            />
          </div>

          <div style={rowSx}>
            <span style={labelSx}>Dimensions:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={doc.width}
                onChange={(e) => updateDocument({ width: parseInt(e.target.value) || 800 })}
                style={inputNumberSx}
              />
              <span>×</span>
              <input
                type="number"
                value={doc.height}
                onChange={(e) => updateDocument({ height: parseInt(e.target.value) || 600 })}
                style={inputNumberSx}
              />
              <span>px</span>
            </div>
          </div>

          <div style={rowSx}>
            <span style={labelSx}>Resolution:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={doc.resolution}
                onChange={(e) => updateDocument({ resolution: parseInt(e.target.value) || 72 })}
                style={inputNumberSx}
              />
              <span>ppi</span>
            </div>
          </div>

          <div style={rowSx}>
            <span style={labelSx}>Canvas Color:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: doc.backgroundColor === 'transparent' ? '#ffffff' : doc.backgroundColor,
                  border: '1px solid #777',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = doc.backgroundColor === 'transparent' ? '#ffffff' : doc.backgroundColor;
                  input.onchange = (e) => updateDocument({ backgroundColor: (e.target as HTMLInputElement).value });
                  input.click();
                }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  updateDocument({
                    backgroundColor: doc.backgroundColor === 'transparent' ? '#ffffff' : 'transparent',
                  })
                }
                sx={{ fontSize: '0.65rem', padding: '1px 6px', minHeight: 20 }}
              >
                {doc.backgroundColor === 'transparent' ? 'Make White' : 'Make Transparent'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE LAYER SELECTED: TRANSFORM & SPECIFIC PROPERTIES */}
      {activeLayer && (
        <div>
          {/* Layer Info Header */}
          <div style={sectionHeaderSx}>
            {activeLayer.type} Layer : {activeLayer.name}
          </div>

          {/* Transform & Position */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: editorTokens.text.secondary, width: 14 }}>X:</span>
                <input
                  type="number"
                  value={Math.round(activeLayer.x)}
                  onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 }, 'Move X')}
                  style={{ ...inputNumberSx, width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: editorTokens.text.secondary, width: 14 }}>Y:</span>
                <input
                  type="number"
                  value={Math.round(activeLayer.y)}
                  onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 }, 'Move Y')}
                  style={{ ...inputNumberSx, width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: editorTokens.text.secondary, width: 14 }}>W:</span>
                <input
                  type="number"
                  value={Math.round(activeLayer.width)}
                  onChange={(e) =>
                    handleUpdate({ width: Math.max(5, parseInt(e.target.value) || 10) }, 'Resize W')
                  }
                  style={{ ...inputNumberSx, width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: editorTokens.text.secondary, width: 14 }}>H:</span>
                <input
                  type="number"
                  value={Math.round(activeLayer.height)}
                  onChange={(e) =>
                    handleUpdate({ height: Math.max(5, parseInt(e.target.value) || 10) }, 'Resize H')
                  }
                  style={{ ...inputNumberSx, width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={labelSx}>Rotation:</span>
              <input
                type="number"
                value={Math.round(activeLayer.rotation)}
                onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value) || 0 }, 'Rotate')}
                style={inputNumberSx}
              />
              <span>°</span>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleUpdate({ rotation: 0 }, 'Reset Rotation')}
                sx={{ fontSize: '0.65rem', padding: '0 4px', minHeight: 20, ml: 'auto' }}
              >
                Reset
              </Button>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, backgroundColor: editorTokens.border.subtle, margin: '10px 0' }} />

          {/* TEXT LAYER PROPERTIES */}
          {activeLayer.type === 'TEXT' && (
            <div>
              <div style={sectionHeaderSx}>Text Properties</div>
              <textarea
                value={(activeLayer as TextLayer).text}
                onChange={(e) =>
                  handleUpdate({ text: e.target.value } as Partial<TextLayer>, 'Change Text')
                }
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: editorTokens.bg.input,
                  border: `1px solid ${editorTokens.border.subtle}`,
                  color: editorTokens.text.primary,
                  fontSize: '0.75rem',
                  padding: '4px 6px',
                  borderRadius: 2,
                  resize: 'vertical',
                  marginBottom: 8,
                }}
              />

              <div style={rowSx}>
                <span style={labelSx}>Font:</span>
                <Select
                  value={(activeLayer as TextLayer).fontFamily}
                  onChange={(e) =>
                    handleUpdate({ fontFamily: e.target.value } as Partial<TextLayer>, 'Change Font')
                  }
                  sx={{ flex: 1, height: 22, fontSize: '0.7rem' }}
                >
                  <MenuItem value="Inter, system-ui, sans-serif">Inter</MenuItem>
                  <MenuItem value="Arial, sans-serif">Arial</MenuItem>
                  <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
                  <MenuItem value="'Courier New', monospace">Courier New</MenuItem>
                  <MenuItem value="Georgia, serif">Georgia</MenuItem>
                  <MenuItem value="'Segoe UI', sans-serif">Segoe UI</MenuItem>
                  <MenuItem value="Impact, sans-serif">Impact</MenuItem>
                </Select>
              </div>

              <div style={rowSx}>
                <span style={labelSx}>Size:</span>
                <input
                  type="number"
                  value={(activeLayer as TextLayer).fontSize}
                  onChange={(e) =>
                    handleUpdate(
                      { fontSize: Math.max(6, parseInt(e.target.value) || 12) } as Partial<TextLayer>,
                      'Change Font Size'
                    )
                  }
                  style={inputNumberSx}
                />
              </div>

              <div style={rowSx}>
                <span style={labelSx}>Color:</span>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: (activeLayer as TextLayer).fill,
                    border: '1px solid #ffffff',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = (activeLayer as TextLayer).fill;
                    input.onchange = (e) =>
                      handleUpdate({ fill: (e.target as HTMLInputElement).value } as Partial<TextLayer>);
                    input.click();
                  }}
                />
              </div>
            </div>
          )}

          {/* SHAPE LAYER PROPERTIES */}
          {activeLayer.type === 'SHAPE' && (() => {
            const shapeLayer = activeLayer as ShapeLayer;
            const fillType = shapeLayer.fillType || 'color';
            const shapeGradient = shapeLayer.gradient || {
              type: 'linear' as GradientType,
              stops: [
                { offset: 0, color: shapeLayer.fill || '#0078d4' },
                { offset: 1, color: '#ffffff' },
              ],
              reverse: false,
              opacity: 1,
            };

            const shapeStops = shapeGradient.stops && shapeGradient.stops.length > 0
              ? shapeGradient.stops
              : [
                  { offset: 0, color: shapeLayer.fill || '#0078d4' },
                  { offset: 1, color: '#ffffff' },
                ];

            return (
              <div>
                <div style={sectionHeaderSx}>Shape Properties</div>

                {/* Fill Mode Toggle */}
                <div style={rowSx}>
                  <span style={labelSx}>Fill Mode:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleUpdate({ fillType: 'color' } as Partial<ShapeLayer>, 'Fill Mode: Solid')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        borderRadius: 2,
                        border: `1px solid ${fillType === 'color' ? '#0078d4' : editorTokens.border.subtle}`,
                        backgroundColor: fillType === 'color' ? editorTokens.accent.primary : editorTokens.bg.input,
                        color: fillType === 'color' ? '#ffffff' : editorTokens.text.secondary,
                        cursor: 'pointer',
                      }}
                    >
                      Solid
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdate(
                          {
                            fillType: 'gradient',
                            gradient: shapeGradient,
                          } as Partial<ShapeLayer>,
                          'Fill Mode: Gradient'
                        )
                      }
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        borderRadius: 2,
                        border: `1px solid ${fillType === 'gradient' ? '#0078d4' : editorTokens.border.subtle}`,
                        backgroundColor: fillType === 'gradient' ? editorTokens.accent.primary : editorTokens.bg.input,
                        color: fillType === 'gradient' ? '#ffffff' : editorTokens.text.secondary,
                        cursor: 'pointer',
                      }}
                    >
                      Gradient
                    </button>
                  </div>
                </div>

                {/* SOLID FILL COLOR */}
                {fillType === 'color' && (
                  <div style={rowSx}>
                    <span style={labelSx}>Color:</span>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: shapeLayer.fill,
                        border: '1px solid #ffffff',
                        borderRadius: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'color';
                        input.value = shapeLayer.fill;
                        input.onchange = (e) =>
                          handleUpdate({ fill: (e.target as HTMLInputElement).value } as Partial<ShapeLayer>);
                        input.click();
                      }}
                    />
                  </div>
                )}

                {/* GRADIENT FILL CONTROLS */}
                {fillType === 'gradient' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    {/* Gradient Type */}
                    <div style={rowSx}>
                      <span style={labelSx}>Type:</span>
                      <Select
                        value={shapeGradient.type || 'linear'}
                        onChange={(e) =>
                          handleUpdate(
                            {
                              gradient: {
                                ...shapeGradient,
                                type: e.target.value as GradientType,
                              },
                            } as Partial<ShapeLayer>,
                            'Gradient Type'
                          )
                        }
                        sx={{ height: 22, fontSize: '0.7rem', minWidth: 100 }}
                      >
                        <MenuItem value="linear">Linear</MenuItem>
                        <MenuItem value="radial">Radial</MenuItem>
                        <MenuItem value="angle">Angle</MenuItem>
                        <MenuItem value="reflected">Reflected</MenuItem>
                        <MenuItem value="diamond">Diamond</MenuItem>
                      </Select>
                    </div>

                    {/* Preset Swatches */}
                    <div style={rowSx}>
                      <span style={labelSx}>Presets:</span>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 140 }}>
                        {GRADIENT_PRESETS.map((preset) => {
                          const pStops = resolveGradientStops(preset.id, foregroundColor, backgroundColor);
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              title={preset.name}
                              onClick={() =>
                                handleUpdate(
                                  {
                                    gradient: {
                                      ...shapeGradient,
                                      presetId: preset.id,
                                      stops: pStops,
                                    },
                                  } as Partial<ShapeLayer>,
                                  'Change Gradient Preset'
                                )
                              }
                              style={{
                                width: 20,
                                height: 16,
                                borderRadius: 2,
                                border: `1px solid ${editorTokens.border.subtle}`,
                                background: formatCssGradient(pStops),
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Start Color & End Color custom pickers */}
                    <div style={rowSx}>
                      <span style={labelSx}>Colors:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Start Stop Color */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>1:</span>
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              backgroundColor: shapeStops[0]?.color || '#000000',
                              border: '1px solid #777',
                              borderRadius: 2,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'color';
                              input.value = shapeStops[0]?.color || '#000000';
                              input.onchange = (e) => {
                                const newStops = [...shapeStops];
                                newStops[0] = { ...newStops[0], color: (e.target as HTMLInputElement).value };
                                handleUpdate(
                                  {
                                    gradient: { ...shapeGradient, stops: newStops },
                                  } as Partial<ShapeLayer>,
                                  'Gradient Start Color'
                                );
                              };
                              input.click();
                            }}
                          />
                        </div>

                        {/* End Stop Color */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>2:</span>
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              backgroundColor: shapeStops[shapeStops.length - 1]?.color || '#ffffff',
                              border: '1px solid #777',
                              borderRadius: 2,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'color';
                              input.value = shapeStops[shapeStops.length - 1]?.color || '#ffffff';
                              input.onchange = (e) => {
                                const newStops = [...shapeStops];
                                newStops[newStops.length - 1] = {
                                  ...newStops[newStops.length - 1],
                                  color: (e.target as HTMLInputElement).value,
                                };
                                handleUpdate(
                                  {
                                    gradient: { ...shapeGradient, stops: newStops },
                                  } as Partial<ShapeLayer>,
                                  'Gradient End Color'
                                );
                              };
                              input.click();
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reverse Toggle */}
                    <div style={rowSx}>
                      <span style={labelSx}>Reverse:</span>
                      <Switch
                        size="small"
                        checked={shapeGradient.reverse ?? false}
                        onChange={(e) =>
                          handleUpdate(
                            {
                              gradient: { ...shapeGradient, reverse: e.target.checked },
                            } as Partial<ShapeLayer>,
                            'Reverse Gradient'
                          )
                        }
                      />
                    </div>
                  </div>
                )}

              <div style={rowSx}>
                <span style={labelSx}>Stroke:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: (activeLayer as ShapeLayer).stroke || '#000000',
                      border: '1px solid #777',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = (activeLayer as ShapeLayer).stroke || '#000000';
                      input.onchange = (e) =>
                        handleUpdate({ stroke: (e.target as HTMLInputElement).value } as Partial<ShapeLayer>);
                      input.click();
                    }}
                  />
                  <input
                    type="number"
                    value={(activeLayer as ShapeLayer).strokeWidth}
                    min={0}
                    max={40}
                    onChange={(e) =>
                      handleUpdate(
                        { strokeWidth: parseInt(e.target.value) || 0 } as Partial<ShapeLayer>,
                        'Stroke Width'
                      )
                    }
                    style={{ ...inputNumberSx, width: 44 }}
                  />
                  <span>px</span>
                </div>
              </div>

              {(activeLayer as ShapeLayer).shapeKind === 'rect' && (
                <div style={rowSx}>
                  <span style={labelSx}>Radius:</span>
                  <input
                    type="number"
                    value={(activeLayer as ShapeLayer).cornerRadius}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      handleUpdate(
                        { cornerRadius: parseInt(e.target.value) || 0 } as Partial<ShapeLayer>,
                        'Corner Radius'
                      )
                    }
                    style={inputNumberSx}
                  />
                  <span>px</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* IMAGE LAYER ADJUSTMENTS & FILTERS */}
          {activeLayer.type === 'IMAGE' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={sectionHeaderSx}>Adjustments & Filters</div>
                <Button
                  size="small"
                  variant="text"
                  onClick={() =>
                    handleUpdate(
                      { adjustments: { ...DEFAULT_ADJUSTMENTS } } as Partial<ImageLayer>,
                      'Reset Adjustments'
                    )
                  }
                  sx={{ fontSize: '0.62rem', padding: '0 4px', minHeight: 18 }}
                >
                  Reset
                </Button>
              </div>

              {/* Brightness */}
              <div style={rowSx}>
                <span style={labelSx}>Bright:</span>
                <Slider
                  value={Math.round((activeLayer as ImageLayer).adjustments.brightness * 100)}
                  min={-100}
                  max={100}
                  onChange={(_, val) =>
                    updateLayer(activeLayer.id, {
                      adjustments: {
                        ...(activeLayer as ImageLayer).adjustments,
                        brightness: (val as number) / 100,
                      },
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <span style={{ width: 28, textAlign: 'right' }}>
                  {Math.round((activeLayer as ImageLayer).adjustments.brightness * 100)}
                </span>
              </div>

              {/* Contrast */}
              <div style={rowSx}>
                <span style={labelSx}>Contrast:</span>
                <Slider
                  value={(activeLayer as ImageLayer).adjustments.contrast}
                  min={-100}
                  max={100}
                  onChange={(_, val) =>
                    updateLayer(activeLayer.id, {
                      adjustments: {
                        ...(activeLayer as ImageLayer).adjustments,
                        contrast: val as number,
                      },
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <span style={{ width: 28, textAlign: 'right' }}>
                  {(activeLayer as ImageLayer).adjustments.contrast}
                </span>
              </div>

              {/* Blur */}
              <div style={rowSx}>
                <span style={labelSx}>Blur:</span>
                <Slider
                  value={(activeLayer as ImageLayer).adjustments.blur}
                  min={0}
                  max={40}
                  onChange={(_, val) =>
                    updateLayer(activeLayer.id, {
                      adjustments: {
                        ...(activeLayer as ImageLayer).adjustments,
                        blur: val as number,
                      },
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <span style={{ width: 28, textAlign: 'right' }}>
                  {(activeLayer as ImageLayer).adjustments.blur}px
                </span>
              </div>

              {/* Noise */}
              <div style={rowSx}>
                <span style={labelSx}>Noise:</span>
                <Slider
                  value={Math.round((activeLayer as ImageLayer).adjustments.noise * 100)}
                  min={0}
                  max={100}
                  onChange={(_, val) =>
                    updateLayer(activeLayer.id, {
                      adjustments: {
                        ...(activeLayer as ImageLayer).adjustments,
                        noise: (val as number) / 100,
                      },
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <span style={{ width: 28, textAlign: 'right' }}>
                  {Math.round((activeLayer as ImageLayer).adjustments.noise * 100)}%
                </span>
              </div>

              {/* Pixelate */}
              <div style={rowSx}>
                <span style={labelSx}>Pixelate:</span>
                <Slider
                  value={(activeLayer as ImageLayer).adjustments.pixelate}
                  min={0}
                  max={30}
                  step={2}
                  onChange={(_, val) =>
                    updateLayer(activeLayer.id, {
                      adjustments: {
                        ...(activeLayer as ImageLayer).adjustments,
                        pixelate: val as number,
                      },
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <span style={{ width: 28, textAlign: 'right' }}>
                  {(activeLayer as ImageLayer).adjustments.pixelate}
                </span>
              </div>

              {/* Toggles (Grayscale, Invert, Sepia) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={(activeLayer as ImageLayer).adjustments.grayscale}
                      onChange={(e) =>
                        updateLayer(activeLayer.id, {
                          adjustments: {
                            ...(activeLayer as ImageLayer).adjustments,
                            grayscale: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Grayscale"
                  sx={{ '& .MuiTypography-root': { fontSize: '0.68rem' }, margin: 0 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={(activeLayer as ImageLayer).adjustments.sepia}
                      onChange={(e) =>
                        updateLayer(activeLayer.id, {
                          adjustments: {
                            ...(activeLayer as ImageLayer).adjustments,
                            sepia: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Sepia"
                  sx={{ '& .MuiTypography-root': { fontSize: '0.68rem' }, margin: 0 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={(activeLayer as ImageLayer).adjustments.invert}
                      onChange={(e) =>
                        updateLayer(activeLayer.id, {
                          adjustments: {
                            ...(activeLayer as ImageLayer).adjustments,
                            invert: e.target.checked,
                          },
                        })
                      }
                    />
                  }
                  label="Invert"
                  sx={{ '& .MuiTypography-root': { fontSize: '0.68rem' }, margin: 0 }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
