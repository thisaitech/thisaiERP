import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Package,
  Plus,
  MagnifyingGlass,
  FunnelSimple,
  TrendUp,
  TrendDown,
  ArrowRight,
  Barcode,
  WarningCircle,
  CheckCircle,
  ArrowsClockwise,
  DownloadSimple,
  UploadSimple,
  Pencil,
  Trash,
  Eye,
  Image as ImageIcon,
  X,
  Tag,
  Percent,
  CurrencyInr,
  Scales,
  Cube,
  Bell,
  Star,
  FloppyDisk,
  Stack,
  Camera,
  QrCode,
  DotsThreeVertical,
  Calendar
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { getItems, createItem, deleteItem, updateItem } from '../services/itemService'
import { toast } from 'sonner'
import { getHSNSuggestions, getGSTRateForHSN } from '../utils/hsnSuggestions'
import { searchItems, autoFillItem, formatItemSuggestion, type MasterItem } from '../services/itemMasterService'
import { getStockDisplay } from '../utils/multiUnitUtils'
import { getLowStockItems } from '../utils/stockUtils'
import { getCategoryDefault, getAllCategories, CATEGORY_DEFAULTS } from '../utils/categoryDefaults'
import BarcodeScanner from '../components/BarcodeScanner'
import { getItemSettings } from '../services/settingsService'

const Inventory = () => {
  // Language support
  const { t, language } = useLanguage()

  const [activeTab, setActiveTab] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [items, setItems] = useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Custom units from Item Settings
  const [customUnits, setCustomUnits] = useState<string[]>([])

  // New Item Form States
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [unitType, setUnitType] = useState('PCS')
  const [retailPrice, setRetailPrice] = useState('')
  const [wholesalePrice, setWholesalePrice] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive') // Default: Inclusive (90% of shops)
  const [purchaseTaxMode, setPurchaseTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive') // Purchase price tax mode
  const [gstRate, setGstRate] = useState('18')
  const [cgstRate, setCgstRate] = useState('9') // CGST% (half of total GST for intrastate)
  const [sgstRate, setSgstRate] = useState('9') // SGST% (half of total GST for intrastate)
  const [igstRate, setIgstRate] = useState('0') // IGST% (for interstate transactions)
  const [itemCategory, setItemCategory] = useState('stationery')
  const [hsnCode, setHsnCode] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockEntryUnit, setStockEntryUnit] = useState('Pcs') // Unit for stock entry (Box/Pcs)

  // {t.inventory.multiUnitConversion} States
  const [hasMultiUnit, setHasMultiUnit] = useState(false)
  const [baseUnit, setBaseUnit] = useState('Pcs')
  const [purchaseUnit, setPurchaseUnit] = useState('Box')
  const [piecesPerPurchaseUnit, setPiecesPerPurchaseUnit] = useState('12')
  const [boxSellingPrice, setBoxSellingPrice] = useState('')
  const [boxPurchasePrice, setBoxPurchasePrice] = useState('')
  const [lastEditedBox, setLastEditedBox] = useState<'selling' | 'purchase' | null>(null)

  // Auto-calculate box prices when piece prices or pcs per box changes
  useEffect(() => {
    if (!hasMultiUnit || lastEditedBox === 'selling') return
    
    if (retailPrice && piecesPerPurchaseUnit && parseInt(piecesPerPurchaseUnit) > 0) {
      const calculated = (parseFloat(retailPrice) * parseInt(piecesPerPurchaseUnit)).toFixed(2)
      setBoxSellingPrice(calculated)
    } else {
      setBoxSellingPrice('')
    }
  }, [retailPrice, piecesPerPurchaseUnit, hasMultiUnit, lastEditedBox])

  useEffect(() => {
    if (!hasMultiUnit || lastEditedBox === 'purchase') return
    
    if (purchasePrice && piecesPerPurchaseUnit && parseInt(piecesPerPurchaseUnit) > 0) {
      const calculated = (parseFloat(purchasePrice) * parseInt(piecesPerPurchaseUnit)).toFixed(2)
      setBoxPurchasePrice(calculated)
    } else {
      setBoxPurchasePrice('')
    }
  }, [purchasePrice, piecesPerPurchaseUnit, hasMultiUnit, lastEditedBox])

  // Calculate piece price from box price when user edits box price
  const handleBoxSellingPriceChange = (value: string) => {
    setBoxSellingPrice(value)
    setLastEditedBox('selling')
    
    if (value && piecesPerPurchaseUnit && parseInt(piecesPerPurchaseUnit) > 0) {
      const piecePriceCalc = (parseFloat(value) / parseInt(piecesPerPurchaseUnit)).toFixed(2)
      setRetailPrice(piecePriceCalc)
    }
  }

  const handleBoxPurchasePriceChange = (value: string) => {
    setBoxPurchasePrice(value)
    setLastEditedBox('purchase')
    
    if (value && piecesPerPurchaseUnit && parseInt(piecesPerPurchaseUnit) > 0) {
      const piecePriceCalc = (parseFloat(value) / parseInt(piecesPerPurchaseUnit)).toFixed(2)
      setPurchasePrice(piecePriceCalc)
    }
  }

  // Reset last edited when user switches back to editing piece prices
  const handleRetailPriceChange = (value: string) => {
    setRetailPrice(value)
    setLastEditedBox(null)
  }

  const handlePurchasePriceChange = (value: string) => {
    setPurchasePrice(value)
    setLastEditedBox(null)
  }

  // Calculate profit per box
  const profitPerBox = (() => {
    try {
      if (boxSellingPrice && boxPurchasePrice) {
        const profit = parseFloat(boxSellingPrice) - parseFloat(boxPurchasePrice)
        return isNaN(profit) ? '' : profit.toFixed(2)
      }
      return ''
    } catch {
      return ''
    }
  })()

  // Margin % = (Profit per Box / Box {t.inventory.purchasePrice}) × 100
  const profitMarginPercent = (() => {
    try {
      if (profitPerBox && boxPurchasePrice) {
        const margin = (parseFloat(profitPerBox) / parseFloat(boxPurchasePrice)) * 100
        return isNaN(margin) ? '' : margin.toFixed(1)
      }
      return ''
    } catch {
      return ''
    }
  })()

  // Autocomplete & Auto-fill States
  const [itemSuggestions, setItemSuggestions] = useState<MasterItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [lowStockAlert, setLowStockAlert] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [itemType, setItemType] = useState('sales') // sales, purchase, both
  const [brandName, setBrandName] = useState('')
  const [barcodeNumber, setBarcodeNumber] = useState('')
  const [showDescriptionAI, setShowDescriptionAI] = useState(false)

  // Expandable sections
  const [showWholesalePrice, setShowWholesalePrice] = useState(false)
  const [showPurchasePrice, setShowPurchasePrice] = useState(false)
  const [showHSN, setShowHSN] = useState(false)
  const [showLowStockAlert, setShowLowStockAlert] = useState(true)
  const [showBrand, setShowBrand] = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)

  // Barcode Scanner states
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [lastScanTime, setLastScanTime] = useState(0)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Detect mobile/touch device on mount
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsMobileDevice(isTouchDevice)
  }, [])

  // HSN Suggestions
  const [hsnSuggestions, setHsnSuggestions] = useState<any[]>([])
  const [showHSNSuggestions, setShowHSNSuggestions] = useState(false)

  // Dropdown menu state
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)

  const emitInventoryUpdate = (itemsData: any[]) => {
    if (typeof window === 'undefined') return
    const detail = { items: itemsData || [] }
    window.dispatchEvent(new CustomEvent('inventory:items-updated', { detail }))
  }

  // Load items from database
  const loadItemsFromDatabase = async () => {
    try {
      setIsLoadingItems(true)
      console.log('🔄 Inventory: Loading items from database...')
      const itemsData = await getItems()
      console.log('📦 Inventory: Loaded', itemsData?.length || 0, 'items from database')
      setItems(itemsData || [])
      emitInventoryUpdate(itemsData || [])
    } catch (error) {
      console.error('Error loading items:', error)
      setItems([])
      emitInventoryUpdate([])
    } finally {
      setIsLoadingItems(false)
    }
  }

  // Load items and custom units on mount
  useEffect(() => {
    loadItemsFromDatabase()
    // Load custom units from item settings
    const itemSettings = getItemSettings()
    setCustomUnits(itemSettings.itemUnits || [])
  }, [])

  // Reload items and units when page becomes visible (e.g., when navigating back from Settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadItemsFromDatabase()
        // Reload custom units in case they were updated in Settings
        const itemSettings = getItemSettings()
        setCustomUnits(itemSettings.itemUnits || [])
      }
    }

    const handleFocus = () => {
      loadItemsFromDatabase()
      // Reload custom units in case they were updated in Settings
      const itemSettings = getItemSettings()
      setCustomUnits(itemSettings.itemUnits || [])
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also reload on focus (when user returns to this tab)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Generate HSN suggestions when item name changes
  useEffect(() => {
    if (itemName && itemName.trim().length >= 3) {
      const suggestions = getHSNSuggestions(itemName, 5)
      setHsnSuggestions(suggestions)
      if (suggestions.length > 0 && !hsnCode) {
        setShowHSNSuggestions(true)
      }
    } else {
      setHsnSuggestions([])
      setShowHSNSuggestions(false)
    }
  }, [itemName])

  // AI Description Suggestions (simple keyword-based for now)
  const getDescriptionSuggestions = (itemName: string): string[] => {
    const name = itemName.toLowerCase()

    // Smart suggestions based on common items
    if (name.includes('pen')) {
      return [
        'Ball pen, blue ink, smooth writing',
        'Office writing pen with comfortable grip',
        'Fine tip ball pen for daily use'
      ]
    } else if (name.includes('chair')) {
      return [
        'Comfortable office chair with armrest',
        'Ergonomic seating with lumbar support',
        'Leather cushion chair with metal base'
      ]
    } else if (name.includes('notebook') || name.includes('copy')) {
      return [
        'Ruled notebook, 200 pages, premium quality',
        'Student notebook with soft cover',
        'Professional notebook for office use'
      ]
    } else if (name.includes('pencil')) {
      return [
        'HB grade pencil for writing and drawing',
        'Dark graphite pencil with eraser',
        'Premium wooden pencil, pack of 10'
      ]
    }

    return [
      `Premium ${name} for daily use`,
      `High-quality ${name} at best price`,
      `Durable ${name} with warranty`
    ]
  }

  // Reset form
  const resetForm = () => {
    setItemName('')
    setItemDescription('')
    setUnitType('PCS')
    setRetailPrice('')
    setWholesalePrice('')
    setPurchasePrice('')
    setTaxMode('inclusive') // Default to Inclusive (90% of shops)
    setPurchaseTaxMode('inclusive') // Default purchase price tax mode
    setGstRate('18')
    setCgstRate('9')
    setSgstRate('9')
    setIgstRate('0')
    setItemCategory('stationery')
    setHsnCode('')
    setStockQuantity('')
    setStockEntryUnit('Pcs') // Reset stock entry unit
    setLowStockAlert('')
    setExpiryDate('')
    setItemType('sales')
    // Reset multi-unit fields
    setHasMultiUnit(false)
    setBaseUnit('Pcs')
    setPurchaseUnit('Box')
    setPiecesPerPurchaseUnit('12')
    setBoxSellingPrice('')
    setBoxPurchasePrice('')
    setLastEditedBox(null)
    setBrandName('')
    setBarcodeNumber('')
    setShowDescriptionAI(false)
    setShowWholesalePrice(false)
    setShowPurchasePrice(false)
    setShowHSN(false)
    setShowLowStockAlert(true)
    setShowBrand(false)
    setShowBarcode(false)
    setHsnSuggestions([])
    setShowHSNSuggestions(false)
    // Reset autocomplete
    setItemSuggestions([])
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  // ✨ MAGIC AUTO-FILL HANDLERS ✨

  // Handle item name input - trigger autocomplete search
  const handleItemNameChange = (value: string) => {
    setItemName(value)

    if (value.length >= 2) {
      const suggestions = searchItems(value)
      setItemSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
      setSelectedSuggestionIndex(-1)
    } else {
      setItemSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Auto-fill all fields when item is selected from suggestions
  const handleSelectSuggestion = (masterItem: MasterItem) => {
    // Fill item name
    setItemName(masterItem.name)

    // Auto-fill Category with proper mapping
    const categoryMap: { [key: string]: string } = {
      'Dairy & Milk Products': 'grocery',
      'Biscuits & Cookies': 'grocery',
      'Atta & Flour': 'grocery',
      'Oil & Ghee': 'grocery',
      'Rice & Pulses': 'grocery',
      'Instant Noodles': 'grocery',
      'Salt & Spices': 'grocery',
      'Health Drinks': 'grocery',
      'Beverages': 'grocery',
      'Toothpaste & Oral Care': 'cosmetics',
      'Soap & Body Wash': 'cosmetics',
      'Personal Care': 'cosmetics',
      'Sanitary Napkins': 'cosmetics',
      'Baby Care': 'cosmetics',
      'Condoms & Contraceptives': 'cosmetics',
      'Detergent & Laundry': 'home',
      'Medicines & Health': 'cosmetics',
      'Electronics': 'electronics',
      'Stationery': 'stationery'
    }
    setItemCategory(categoryMap[masterItem.category] || 'other')

    // Auto-fill Unit Type
    const unitMap: { [key: string]: string } = {
      'Pieces': 'PCS',
      'Kilograms': 'KGS',
      'Grams': 'KGS',
      'Litres': 'LTRS',
      'Millilitres': 'LTRS',
      'Packets': 'PACK',
      'Jars': 'PCS',
      'Meters': 'MTR'
    }
    setUnitType(unitMap[masterItem.unit] || 'PCS')

    // Auto-fill Description
    setItemDescription(masterItem.description || `${masterItem.name} - Premium Quality`)

    // Auto-fill Retail Price (MRP)
    setRetailPrice(masterItem.mrp.toString())

    // Auto-fill {t.inventory.purchasePrice}
    setPurchasePrice(masterItem.purchase_price.toString())

    // Auto-fill GST Rate
    setGstRate(masterItem.gst_rate.toString())
    // Auto-fill individual tax rates (for intrastate transactions, CGST = SGST = Total/2)
    setCgstRate((masterItem.gst_rate / 2).toString())
    setSgstRate((masterItem.gst_rate / 2).toString())
    setIgstRate('0') // Default to 0 for IGST (user can change if interstate)

    // Auto-fill {t.inventory.hsnCode}
    setHsnCode(masterItem.hsn)

    // Close suggestions
    setShowSuggestions(false)
    setItemSuggestions([])

    // Show success toast
    toast.success('🎉 All fields auto-filled! Like magic!', {
      description: `${masterItem.name} ready to add`,
      duration: 2000
    })
  }

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || itemSuggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev < itemSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : itemSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleSelectSuggestion(itemSuggestions[selectedSuggestionIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  // Handle add item
  const handleAddItem = async () => {
    if (!itemName?.trim() || !retailPrice?.trim()) {
      toast.error('Please fill Item Name and Retail Price')
      return
    }

    setIsLoading(true)
    try {
      const gstRateValue = parseInt(gstRate) || 0
      const cgst = parseFloat(cgstRate) || 0
      const sgst = parseFloat(sgstRate) || 0
      const igst = parseFloat(igstRate) || 0
      const newItem = await createItem({
        name: itemName.trim(),
        description: itemDescription?.trim() || '',
        itemCode: `ITEM${Date.now()}`,
        unit: unitType,
        sellingPrice: parseFloat(retailPrice),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        taxPreference: gstRateValue > 0 ? 'taxable' : 'non-taxable',
        taxMode: taxMode, // Tax mode for selling price
        purchaseTaxMode: purchaseTaxMode, // Tax mode for purchase price
        tax: {
          cgst: cgst,
          sgst: sgst,
          igst: igst,
          cess: 0
        },
        category: itemCategory,
        hsnCode: hsnCode?.trim() || undefined,
        brand: brandName?.trim() || undefined,
        barcode: barcodeNumber?.trim() || undefined,
        // Calculate stock in base units (Pcs)
        // If entering in Box, multiply by piecesPerPurchaseUnit
        // If entering in Pcs, use as-is
        stock: (() => {
          const qty = parseInt(stockQuantity) || 0
          if (hasMultiUnit && stockEntryUnit === purchaseUnit) {
            // Entered in boxes, convert to pieces
            return qty * (parseInt(piecesPerPurchaseUnit) || 12)
          }
          return qty
        })(),
        minStock: 0,
        maxStock: stockQuantity ? parseInt(stockQuantity) * 2 : 100,
        reorderPoint: lowStockAlert ? parseInt(lowStockAlert) : 10,
        isActive: true,
        // {t.inventory.multiUnitConversion} Fields
        hasMultiUnit: hasMultiUnit,
        baseUnit: hasMultiUnit ? baseUnit : undefined,
        purchaseUnit: hasMultiUnit ? purchaseUnit : undefined,
        piecesPerPurchaseUnit: hasMultiUnit ? parseInt(piecesPerPurchaseUnit) || 12 : undefined,
        boxSellingPrice: hasMultiUnit && boxSellingPrice ? parseFloat(boxSellingPrice) : undefined,
        boxPurchasePrice: hasMultiUnit && boxPurchasePrice ? parseFloat(boxPurchasePrice) : undefined,
        defaultSaleUnitId: hasMultiUnit ? baseUnit : undefined,
        defaultPurchaseUnitId: hasMultiUnit ? purchaseUnit : undefined,
        // Store stock in base units
        stockBase: (() => {
          if (!hasMultiUnit || !stockQuantity) return undefined
          const qty = parseInt(stockQuantity) || 0
          if (stockEntryUnit === purchaseUnit) {
            // Entered in boxes, convert to pieces
            return qty * (parseInt(piecesPerPurchaseUnit) || 12)
          }
          return qty
        })(),
        // Expiry Date - optional
        expiryDate: expiryDate || undefined
      })

      setItems([newItem, ...items])
      toast.success('Item added successfully!')
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle View Item
  const handleViewItem = (item: any) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  // Handle {t.inventory.editItem}
  const handleEditItem = (item: any) => {
    setSelectedItem(item)
    // Populate form with item data
    setItemName(item.name || '')
    setItemDescription(item.description || '')
    setUnitType(item.unit || 'PCS')
    setRetailPrice(item.sellingPrice?.toString() || '')
    setPurchasePrice(item.purchasePrice?.toString() || '')
    setTaxMode(item.taxMode || 'inclusive') // Load saved tax mode or default to inclusive
    setPurchaseTaxMode(item.purchaseTaxMode || 'inclusive') // Load saved purchase tax mode or default to inclusive
    // Calculate total GST rate from tax components (CGST + SGST = Total GST for intrastate)
    const totalGstRate = item.tax?.igst || (item.tax?.cgst + item.tax?.sgst) || 18
    setGstRate(totalGstRate.toString())
    // Load individual tax components
    setCgstRate((item.tax?.cgst || 9).toString())
    setSgstRate((item.tax?.sgst || 9).toString())
    setIgstRate((item.tax?.igst || 0).toString())
    setItemCategory(item.category || 'stationery')
    setHsnCode(item.hsnCode || '')
    setStockQuantity(item.stock?.toString() || '')
    setLowStockAlert(item.reorderPoint?.toString() || '')
    setBrandName(item.brand || '')
    setBarcodeNumber(item.barcode || '')
    // Load multi-unit fields
    setHasMultiUnit(item.hasMultiUnit || false)
    setBaseUnit(item.baseUnit || 'Pcs')
    setPurchaseUnit(item.purchaseUnit || 'Box')
    setPiecesPerPurchaseUnit(item.piecesPerPurchaseUnit?.toString() || '12')
    setBoxSellingPrice(item.boxSellingPrice?.toString() || '')
    setBoxPurchasePrice(item.boxPurchasePrice?.toString() || '')
    setLastEditedBox(null) // Reset editing mode
    // Stock is already stored in base units, so default entry unit to base
    setStockEntryUnit(item.baseUnit || 'Pcs')
    setShowEditModal(true)
  }

  // Handle Delete Item
  const handleDeleteItem = (item: any) => {
    setSelectedItem(item)
    setShowDeleteConfirm(true)
  }

  // Save Edited Item
  const saveEditedItem = async () => {
    if (!selectedItem) return

    // Validation
    if (!itemName.trim()) {
      toast.error('Please enter item name')
      return
    }

    if (!retailPrice || parseFloat(retailPrice) <= 0) {
      toast.error('Please enter a valid retail price')
      return
    }

    setIsLoading(true)
    try {
      const gstRateValue = parseInt(gstRate) || 0
      const cgst = parseFloat(cgstRate) || 0
      const sgst = parseFloat(sgstRate) || 0
      const igst = parseFloat(igstRate) || 0
      const updates: any = {
        name: itemName.trim(),
        description: itemDescription?.trim() || '',
        unit: unitType,
        sellingPrice: parseFloat(retailPrice),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
        taxPreference: gstRateValue > 0 ? 'taxable' : 'non-taxable',
        taxMode: taxMode, // Tax mode for selling price
        purchaseTaxMode: purchaseTaxMode, // Tax mode for purchase price
        tax: {
          cgst: cgst,
          sgst: sgst,
          igst: igst,
          cess: 0
        },
        category: itemCategory,
        // Calculate stock in base units (Pcs)
        // If entering in Box, multiply by piecesPerPurchaseUnit
        stock: (() => {
          const qty = parseInt(stockQuantity) || 0
          if (hasMultiUnit && stockEntryUnit === purchaseUnit) {
            // Entered in boxes, convert to pieces
            return qty * (parseInt(piecesPerPurchaseUnit) || 12)
          }
          return qty
        })(),
        reorderPoint: lowStockAlert ? parseInt(lowStockAlert) : 10
      }

      // Only add optional fields if they have values (Firebase doesn't allow undefined)
      if (hsnCode?.trim()) {
        updates.hsnCode = hsnCode.trim()
      }
      if (brandName?.trim()) {
        updates.brand = brandName.trim()
      }
      if (barcodeNumber?.trim()) {
        updates.barcode = barcodeNumber.trim()
      }

      // {t.inventory.multiUnitConversion} Fields
      updates.hasMultiUnit = hasMultiUnit
      if (hasMultiUnit) {
        updates.baseUnit = baseUnit
        updates.purchaseUnit = purchaseUnit
        updates.piecesPerPurchaseUnit = parseInt(piecesPerPurchaseUnit) || 12
        updates.defaultSaleUnitId = baseUnit
        updates.defaultPurchaseUnitId = purchaseUnit
        if (boxSellingPrice) {
          updates.boxSellingPrice = parseFloat(boxSellingPrice)
        }
        if (boxPurchasePrice) {
          updates.boxPurchasePrice = parseFloat(boxPurchasePrice)
        }
        if (stockQuantity) {
          // Store in base units
          const qty = parseInt(stockQuantity) || 0
          if (stockEntryUnit === purchaseUnit) {
            updates.stockBase = qty * (parseInt(piecesPerPurchaseUnit) || 12)
          } else {
            updates.stockBase = qty
          }
        }
      }

      console.log('📝 Updating item:', selectedItem.id, updates)
      const success = await updateItem(selectedItem.id, updates)
      console.log('✅ Update result:', success)

      if (success) {
        toast.success('Item updated successfully!')
        await loadItemsFromDatabase()
        setShowEditModal(false)
        setSelectedItem(null)
        resetForm()
      } else {
        toast.error('Failed to update item')
      }
    } catch (error) {
      console.error('❌ Error updating item:', error)
      toast.error('Failed to update item. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Confirm Delete
  const confirmDelete = async () => {
    if (!selectedItem) return

    try {
      await deleteItem(selectedItem.id)
      toast.success('Item deleted successfully!')
      await loadItemsFromDatabase()
      setShowDeleteConfirm(false)
      setSelectedItem(null)
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  // Handle action menu click
  const handleActionMenuClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()

    if (openActionMenu === itemId) {
      setOpenActionMenu(null)
      setDropdownPosition(null)
    } else {
      const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setDropdownPosition({
        top: buttonRect.bottom + 4,
        right: window.innerWidth - buttonRect.right
      })
      setOpenActionMenu(itemId)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      if (openActionMenu) {
        setOpenActionMenu(null)
        setDropdownPosition(null)
      }
    }

    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [openActionMenu])

  // Inventory Summary - Calculate from real items data
  const inventorySummary = (() => {
    const totalItems = items.length
    const totalValue = items.reduce((sum, item) => sum + ((item.stock || 0) * (item.sellingPrice || 0)), 0)
    const lowStockItemsList = getLowStockItems(items)
    const lowStockItems = lowStockItemsList.length
    const outOfStockItems = items.filter(item => (item.stock || 0) === 0).length
    const uniqueCategories = new Set(items.map(item => item.category)).size
    const avgStockValue = totalItems > 0 ? totalValue / totalItems : 0

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      categories: uniqueCategories,
      avgStockValue
    }
  })()

  // Categories - Calculate from real items data
  const categories = (() => {
    const categoryCounts: Record<string, number> = {}
    items.forEach(item => {
      const cat = item.category || 'other'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })

    const categoryList = [
      { id: 'all', name: 'All Items', count: items.length }
    ]

    Object.entries(categoryCounts).forEach(([id, count]) => {
      const categoryNames: Record<string, string> = {
        electronics: 'Electronics',
        furniture: 'Furniture',
        stationery: 'Stationery',
        hardware: 'Hardware',
        grocery: 'Grocery/Provisions',
        clothing: 'Clothing/Apparel',
        home: 'Home & Kitchen',
        cosmetics: 'Cosmetics/Beauty',
        toys: 'Toys & Games',
        other: 'Other'
      }
      categoryList.push({
        id,
        name: categoryNames[id] || id.charAt(0).toUpperCase() + id.slice(1),
        count
      })
    })

    return categoryList
  })()

  // Stock Items with calculations
  const stockItems = [
    {
      id: 1,
      name: 'Premium Office Chair',
      sku: 'POC-001',
      category: 'Furniture',
      currentStock: 23,
      reorderLevel: 10,
      maxStock: 50,
      unitPrice: 3000,
      sellingPrice: 4500,
      stockValue: 69000,
      lastPurchase: '2025-11-10',
      supplier: 'Furniture World',
      status: 'normal',
      batchNo: 'BT-2025-001',
      movement: { in: 15, out: 7 },
      profit: 1500,
      margin: 33.33
    },
    {
      id: 2,
      name: 'Wireless Mouse',
      sku: 'WM-045',
      category: 'Electronics',
      currentStock: 8,
      reorderLevel: 15,
      maxStock: 100,
      unitPrice: 250,
      sellingPrice: 450,
      stockValue: 2000,
      lastPurchase: '2025-11-08',
      supplier: 'Tech Supplies',
      status: 'low',
      batchNo: 'BT-2025-045',
      movement: { in: 50, out: 42 },
      profit: 200,
      margin: 44.44
    },
    {
      id: 3,
      name: 'A4 Paper Ream',
      sku: 'AP-120',
      category: 'Stationery',
      currentStock: 150,
      reorderLevel: 30,
      maxStock: 200,
      unitPrice: 180,
      sellingPrice: 250,
      stockValue: 27000,
      lastPurchase: '2025-11-12',
      supplier: 'Paper Mart',
      status: 'normal',
      batchNo: 'BT-2025-120',
      movement: { in: 100, out: 50 },
      profit: 70,
      margin: 28.00
    },
    {
      id: 4,
      name: 'LED Monitor 24"',
      sku: 'LM-024',
      category: 'Electronics',
      currentStock: 0,
      reorderLevel: 5,
      maxStock: 30,
      unitPrice: 8500,
      sellingPrice: 12000,
      stockValue: 0,
      lastPurchase: '2025-10-28',
      supplier: 'Display Tech',
      status: 'out',
      batchNo: 'BT-2024-024',
      movement: { in: 10, out: 10 },
      profit: 3500,
      margin: 29.17
    },
    {
      id: 5,
      name: 'Executive Desk',
      sku: 'ED-200',
      category: 'Furniture',
      currentStock: 12,
      reorderLevel: 8,
      maxStock: 25,
      unitPrice: 12000,
      sellingPrice: 18000,
      stockValue: 144000,
      lastPurchase: '2025-11-05',
      supplier: 'Furniture World',
      status: 'normal',
      batchNo: 'BT-2025-200',
      movement: { in: 8, out: 4 },
      profit: 6000,
      margin: 33.33
    },
    {
      id: 6,
      name: 'Printer Ink Cartridge',
      sku: 'PIC-089',
      category: 'Consumables',
      currentStock: 6,
      reorderLevel: 20,
      maxStock: 80,
      unitPrice: 450,
      sellingPrice: 650,
      stockValue: 2700,
      lastPurchase: '2025-11-11',
      supplier: 'Print Solutions',
      status: 'low',
      batchNo: 'BT-2025-089',
      movement: { in: 30, out: 24 },
      profit: 200,
      margin: 30.77
    }
  ]

  // Stock movements will be tracked from actual purchase and sales invoices
  const recentMovements: any[] = []

  const getStockStatus = (item: any) => {
    const stock = item.stock || 0
    const reorderPoint = item.reorderPoint || 0
    if (stock === 0) return { label: 'Out of Stock', color: 'destructive', icon: WarningCircle }
    if (stock <= reorderPoint) return { label: 'Low Stock', color: 'warning', icon: WarningCircle }
    return { label: 'In Stock', color: 'success', icon: CheckCircle }
  }

  const getStockPercentage = (current: number, max: number) => {
    if (!max || max === 0) return 0
    return Math.min((current / max) * 100, 100)
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category?.toLowerCase() === selectedCategory.toLowerCase()
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'low' && item.stock <= item.reorderPoint && item.stock > 0) ||
                      (activeTab === 'out' && item.stock === 0) ||
                      (activeTab === 'normal' && item.stock > item.reorderPoint)
    return matchesSearch && matchesCategory && matchesTab
  })

  return (
    <div className="h-screen overflow-hidden flex flex-col p-3 sm:p-4 lg:p-4 pb-2 bg-[#f5f7fa] dark:bg-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 flex-shrink-0"
      >
        {/* Top Row: KPI Cards (Left) + Filters & Actions (Right) */}
        <div className="flex items-stretch justify-between gap-4 mb-3">
          {/* Left Side: KPI Cards - Rectangular filling space */}
          <div className="flex-1 grid grid-cols-4 gap-3">
            {/* Total Items Card - Blue Theme */}
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-500 shadow-[6px_6px_12px_rgba(59,130,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(59,130,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button
                onClick={() => setActiveTab('all')}
                className="w-full h-full bg-[#e4ebf5] rounded-[14px] px-4 py-3 transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e4ebf5] flex items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <Package size={20} weight="duotone" className="text-blue-500" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Total Items</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{inventorySummary.totalItems}</span>
                </div>
              </button>
            </div>

            {/* Low Stock Card - Amber Theme */}
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 shadow-[6px_6px_12px_rgba(245,158,11,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(245,158,11,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button
                onClick={() => setActiveTab('low')}
                className="w-full h-full bg-[#e4ebf5] rounded-[14px] px-4 py-3 transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e4ebf5] flex items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <WarningCircle size={20} weight="duotone" className="text-amber-500" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent font-semibold">Low Stock</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{inventorySummary.lowStockItems}</span>
                </div>
              </button>
            </div>

            {/* Out of Stock Card - Red Theme */}
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-red-400 to-rose-500 shadow-[6px_6px_12px_rgba(239,68,68,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(239,68,68,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button
                onClick={() => setActiveTab('out')}
                className="w-full h-full bg-[#e4ebf5] rounded-[14px] px-4 py-3 transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e4ebf5] flex items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <X size={20} weight="bold" className="text-red-500" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-semibold">Out of Stock</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">{inventorySummary.outOfStockItems}</span>
                </div>
              </button>
            </div>

            {/* Stock Value Card - Green Theme */}
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 shadow-[6px_6px_12px_rgba(34,197,94,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(34,197,94,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <button
                className="w-full h-full bg-[#e4ebf5] rounded-[14px] px-4 py-3 transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e4ebf5] flex items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]">
                  <CurrencyInr size={20} weight="duotone" className="text-green-500" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Stock Value</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    ₹{inventorySummary.totalValue >= 10000000 ? (inventorySummary.totalValue / 10000000).toFixed(1) + ' Cr' : inventorySummary.totalValue >= 100000 ? (inventorySummary.totalValue / 100000).toFixed(1) + ' L' : inventorySummary.totalValue >= 1000 ? (inventorySummary.totalValue / 1000).toFixed(1) + ' K' : inventorySummary.totalValue.toLocaleString('en-IN')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Right Side: Date Filters + Action Buttons */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Action Button */}
            <button
              onClick={() => {
                console.log('🔴 ADD ITEM BUTTON CLICKED')
                setShowAddModal(true)
                console.log('🟢 showAddModal set to TRUE')
              }}
              className="h-9 px-4 rounded-xl bg-blue-600 text-xs text-white font-semibold flex items-center gap-1.5
                shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
                dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
                active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15)]
                transition-all duration-200"
            >
              <Plus size={14} weight="bold" />
              <span className="hidden sm:inline">{t.inventory.addItem}</span>
            </button>

            {/* Date Filter Tabs */}
            <div className="inline-flex items-center gap-1 text-xs bg-[#f5f7fa] dark:bg-slate-800 rounded-xl p-1.5 shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]">
              {['today', 'week', 'month', 'year', 'all', 'custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
                    selectedPeriod === period
                      ? "bg-blue-600 text-white shadow-[3px_3px_6px_#e0e3e7,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

      </motion.div>

      {/* Search Bar & Category Filter Row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-3"
      >
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text"
              placeholder={t.inventory.searchByNameSku}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#f5f7fa] dark:bg-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155] transition-all"
            />
          </div>

          {/* Category Filter Pills - Right Side */}
          <div className="flex-shrink-0">
            <div className="inline-flex items-center gap-1 bg-[#f5f7fa] dark:bg-slate-800 rounded-xl p-1.5 shadow-[inset_3px_3px_6px_#e0e3e7,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
                    selectedCategory === cat.id
                      ? "bg-[#f5f7fa] dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[3px_3px_6px_#e0e3e7,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Filters */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0">
        {[
          { id: 'all', label: t.inventory.allItems, count: items.length },
          { id: 'normal', label: t.inventory.inStock, count: items.filter(item => {
            const stock = item.stock || 0
            const reorderPoint = item.reorderPoint || 0
            return stock > reorderPoint
          }).length },
          { id: 'low', label: t.inventory.lowStock, count: items.filter(item => {
            const stock = item.stock || 0
            const reorderPoint = item.reorderPoint || 0
            return stock > 0 && stock <= reorderPoint
          }).length },
          { id: 'out', label: t.inventory.outOfStock, count: items.filter(item => (item.stock || 0) === 0).length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-[#f5f7fa] dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[3px_3px_6px_#e0e3e7,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Desktop Table Header (Hidden on Mobile) */}
      <div className="hidden md:flex items-center px-3 py-2 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex-shrink-0">
        <div style={{ width: '20%' }}>Item Name</div>
        <div style={{ width: '12%' }}>Category</div>
        <div style={{ width: '10%' }} className="text-right">Stock</div>
        <div style={{ width: '10%' }} className="text-right">Unit</div>
        <div style={{ width: '12%' }} className="text-right">Price</div>
        <div style={{ width: '12%' }} className="text-right">Value</div>
        <div style={{ width: '10%' }} className="text-center">Status</div>
        <div style={{ width: '14%' }} className="text-center">Actions</div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-1 pb-2">
        {isLoadingItems ? (
          <div className="flex items-center justify-center py-20">
            <ArrowsClockwise size={32} weight="duotone" className="text-blue-600 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} weight="duotone" className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {searchQuery ? t.inventory.noItemsFound : t.inventory.noItemsInInventory}
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const status = getStockStatus(item)
            const stockValue = (item.stock || 0) * (item.purchasePrice || 0)

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                {/* Desktop Row */}
                <div className="hidden md:flex items-center px-3 py-2 bg-white rounded-lg border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all">
                  {/* Item Name */}
                  <div style={{ width: '20%' }} className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg flex-shrink-0 bg-blue-50">
                      <Package size={16} weight="duotone" className="text-blue-600" />
                    </div>
                    <span className="font-medium text-xs text-slate-800 truncate">
                      {item.name}
                    </span>
                  </div>

                  {/* Category */}
                  <div style={{ width: '12%' }} className="text-xs text-slate-600 truncate capitalize">
                    {item.category || '-'}
                  </div>

                  {/* Stock */}
                  <div style={{ width: '10%' }} className="text-right text-xs text-slate-800 font-medium">
                    {item.hasMultiUnit
                      ? getStockDisplay(
                          item.stock || 0,
                          item.piecesPerPurchaseUnit || 12,
                          item.purchaseUnit || 'Box',
                          item.baseUnit || 'Pcs'
                        ).displayText
                      : `${item.stock || 0}`
                    }
                  </div>

                  {/* Unit */}
                  <div style={{ width: '10%' }} className="text-right text-xs text-slate-500">
                    {item.unit || 'PCS'}
                  </div>

                  {/* Price */}
                  <div style={{ width: '12%' }} className="text-right text-xs text-slate-800 font-semibold">
                    ₹{(item.sellingPrice || 0).toLocaleString('en-IN')}
                  </div>

                  {/* Value */}
                  <div style={{ width: '12%' }} className="text-right text-xs text-slate-600">
                    ₹{stockValue.toLocaleString('en-IN')}
                  </div>

                  {/* Status Badge */}
                  <div style={{ width: '10%' }} className="flex justify-center">
                    <span className={cn(
                      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                      status.color === 'success' && "bg-emerald-50 text-emerald-700",
                      status.color === 'warning' && "bg-amber-50 text-amber-700",
                      status.color === 'destructive' && "bg-red-50 text-red-700"
                    )}>
                      <status.icon size={10} weight="fill" />
                      <span>{status.label}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ width: '14%' }} className="flex items-center justify-center gap-0.5">
                    <button
                      onClick={() => handleViewItem(item)}
                      className="w-7 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye size={14} weight="duotone" className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleEditItem(item)}
                      className="w-7 h-7 flex items-center justify-center bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} weight="duotone" className="text-amber-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash size={14} weight="duotone" className="text-red-600" />
                    </button>

                    {/* More Actions Dropdown */}
                    <button
                      onClick={(e) => handleActionMenuClick(e, item.id)}
                      className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                      title="More"
                    >
                      <DotsThreeVertical size={14} weight="bold" className="text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Mobile Card */}
                <div className="md:hidden bg-white rounded-lg border border-slate-100 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="p-2 rounded-lg flex-shrink-0 bg-blue-50">
                        <Package size={18} weight="duotone" className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-800 truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-500 capitalize">{item.category || '-'}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ml-2",
                      status.color === 'success' && "bg-emerald-50 text-emerald-700",
                      status.color === 'warning' && "bg-amber-50 text-amber-700",
                      status.color === 'destructive' && "bg-red-50 text-red-700"
                    )}>
                      <status.icon size={10} weight="fill" />
                      <span>{status.label}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <div className="text-slate-400 mb-0.5">Stock</div>
                      <div className="font-semibold text-slate-800">
                        {item.hasMultiUnit
                          ? getStockDisplay(
                              item.stock || 0,
                              item.piecesPerPurchaseUnit || 12,
                              item.purchaseUnit || 'Box',
                              item.baseUnit || 'Pcs'
                            ).displayText
                          : `${item.stock || 0} ${item.unit || 'PCS'}`
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Price</div>
                      <div className="font-semibold text-slate-800">₹{(item.sellingPrice || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Unit</div>
                      <div className="text-slate-600">{item.unit || 'PCS'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Value</div>
                      <div className="text-slate-600">₹{stockValue.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleViewItem(item)}
                      className="w-7 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Eye size={16} weight="duotone" className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleEditItem(item)}
                      className="w-7 h-7 flex items-center justify-center bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      <Pencil size={16} weight="duotone" className="text-amber-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash size={16} weight="duotone" className="text-red-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          }))}
      </div>

      {/* Add Item Modal - Professional & Comprehensive */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2" onClick={() => { setShowAddModal(false); resetForm(); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border w-full max-w-3xl max-h-[98vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-4 py-2 border-b border-border bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Package size={20} weight="duotone" className="text-primary" />
                      {t.inventory.addNewItem}
                    </h2>
                    <button
                      onClick={() => {
                        setShowAddModal(false)
                        resetForm()
                      }}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="space-y-2">
                    {/* Section 1: Basic Info */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Cube size={14} weight="duotone" />
                        {t.inventory.basicInfo}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Item Name with Magic Autocomplete */}
                        <div className="sm:col-span-2 relative">
                          <label className="text-xs font-medium mb-1 block flex items-center gap-2">
                            {t.inventory.itemName} <span className="text-destructive">*</span>
                            <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-semibold">
                              ✨ {t.inventory.autoFillMagic}
                            </span>
                          </label>
                          <input
                            type="text"
                            value={itemName}
                            onChange={(e) => handleItemNameChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder={t.inventory.startTyping}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          />

                          {/* Autocomplete Suggestions Dropdown */}
                          {showSuggestions && itemSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-2xl max-h-80 overflow-y-auto"
                            >
                              <div className="p-2 bg-primary/5 border-b border-border">
                                <p className="text-xs text-muted-foreground font-medium">
                                  ✨ {itemSuggestions.length} {t.inventory.itemsFound}
                                </p>
                              </div>
                              {itemSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSelectSuggestion(suggestion)}
                                  className={cn(
                                    'w-full p-3 text-left hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0',
                                    selectedSuggestionIndex === index && 'bg-primary/10'
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">{suggestion.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{suggestion.category}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-bold text-sm text-primary">₹{suggestion.mrp}</p>
                                      <p className="text-xs text-muted-foreground">GST {suggestion.gst_rate}%</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {itemName.length >= 2 && !showSuggestions && itemSuggestions.length === 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                {t.inventory.noSuggestions}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Unit Type */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Scales size={14} weight="duotone" />
                            {t.inventory.unitType} <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={unitType}
                            onChange={(e) => setUnitType(e.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            <option value="NONE">{t.inventory.none}</option>
                            <option value="PCS">{t.inventory.pieces}</option>
                            <option value="KGS">{t.inventory.kilogram}</option>
                            <option value="LTRS">{t.inventory.liter}</option>
                            <option value="MTR">{t.inventory.meter}</option>
                            <option value="BOX">{t.inventory.box}</option>
                            <option value="PACK">{t.inventory.pack}</option>
                            <option value="SET">{t.inventory.set}</option>
                            {/* Custom units from Item Settings - filter out duplicates */}
                            {(() => {
                              // Default unit values/names to filter out
                              const defaultUnits = ['NONE', 'PCS', 'KGS', 'LTRS', 'MTR', 'BOX', 'PACK', 'SET', 'pieces', 'kilogram', 'liter', 'meter', 'box', 'pack', 'set', 'kg', 'ltr']
                              const filteredUnits = customUnits.filter(unit => {
                                const unitLower = unit.toLowerCase()
                                const unitAbbr = unit.match(/\(([^)]+)\)/)?.[1]?.toLowerCase() || ''
                                // Check if this custom unit matches any default unit
                                return !defaultUnits.some(def =>
                                  unitLower.includes(def.toLowerCase()) ||
                                  unitAbbr === def.toLowerCase() ||
                                  def.toLowerCase() === unitLower
                                )
                              })
                              return filteredUnits.length > 0 ? (
                                <optgroup label="Custom Units">
                                  {filteredUnits.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </optgroup>
                              ) : null
                            })()}
                          </select>
                        </div>

                        {/* Category - Auto-fills Unit Conversion */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Tag size={14} weight="duotone" />
                            {t.inventory.category}
                            <span className="text-[10px] text-blue-600 font-normal ml-1">{t.inventory.autoFillsUnit}</span>
                          </label>
                          <select
                            value={itemCategory}
                            onChange={(e) => {
                              const category = e.target.value
                              setItemCategory(category)

                              // {t.inventory.hsnCode} mapping based on category
                              const hsnMapping: Record<string, string> = {
                                stationery: '4820',
                                Stationery: '4820',
                                electronics: '8518',
                                Electronics: '8518',
                                furniture: '9403',
                                Furniture: '9403',
                                hardware: '7326',
                                Hardware: '7326',
                                grocery: '1101',
                                Grocery: '1101',
                                Biscuits: '1905',
                                Chips: '1905',
                                Chocolate: '1806',
                                'Soft Drinks': '2202',
                                Juice: '2009',
                                Noodles: '1902',
                                Pasta: '1902',
                                Oil: '1512',
                                Soap: '3401',
                                Shampoo: '3305',
                                Toothpaste: '3306',
                                Detergent: '3402',
                                clothing: '6109',
                                Clothing: '6109',
                                home: '3402',
                                cosmetics: '3304',
                                Cosmetics: '3304',
                                toys: '9503',
                                Toys: '9503',
                                Tablets: '3004',
                                Syrup: '3004',
                                other: '9999',
                                Other: '9999',
                                General: '9999'
                              }

                              // Auto-fill HSN code based on category
                              const hsnCodeValue = hsnMapping[category] || '9999'
                              setHsnCode(hsnCodeValue)
                              setShowHSN(true)

                              // AUTO-FILL UNIT CONVERSION from Category Defaults
                              const categoryDefault = getCategoryDefault(category)
                              if (categoryDefault) {
                                setHasMultiUnit(true)
                                setBaseUnit('Pcs')
                                setPurchaseUnit(categoryDefault.alternateUnit)
                                setPiecesPerPurchaseUnit(categoryDefault.piecesPerUnit.toString())
                                toast.success(`Auto-filled: 1 ${categoryDefault.alternateUnit} = ${categoryDefault.piecesPerUnit} Pcs`, {
                                  duration: 2000,
                                  icon: '📦'
                                })
                              }
                            }}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            {/* Custom Categories from Settings */}
                            {(() => {
                              const customCategories = getItemSettings().productCategories || []
                              const builtInCategories = ['Biscuits', 'Chips', 'Chocolate', 'Soap', 'Soft Drinks', 'Noodles', 'Juice', 'Water Bottles', 'Pasta', 'Rice', 'Oil', 'Milk', 'Tea', 'Coffee', 'Shampoo', 'Toothpaste', 'Cream', 'Detergent', 'Sanitizer', 'Stationery', 'Pens', 'Notebooks', 'Pencils', 'Batteries', 'Bulbs', 'Electronics', 'Furniture', 'Tablets', 'Syrup', 'General', 'Other']
                              const newCategories = customCategories.filter(c => !builtInCategories.includes(c))
                              if (newCategories.length > 0) {
                                return (
                                  <optgroup label="⭐ Your Categories">
                                    {newCategories.map(cat => (
                                      <option key={cat} value={cat}>📁 {cat}</option>
                                    ))}
                                  </optgroup>
                                )
                              }
                              return null
                            })()}
                            <optgroup label="Common Categories">
                              <option value="Biscuits">🍪 Biscuits (1 Box = 12 Pcs)</option>
                              <option value="Chips">🥔 Chips (1 Box = 24 Pcs)</option>
                              <option value="Chocolate">🍫 Chocolate (1 Box = 24 Pcs)</option>
                              <option value="Soap">🧼 Soap (1 Pack = 4 Pcs)</option>
                              <option value="Soft Drinks">🥤 Soft Drinks (1 Crate = 24 Pcs)</option>
                              <option value="Noodles">🍜 Noodles (1 Box = 30 Pcs)</option>
                            </optgroup>
                            <optgroup label="Food & Beverages">
                              <option value="Juice">🧃 Juice (1 Box = 12 Pcs)</option>
                              <option value="Water Bottles">💧 Water Bottles (1 Case = 24 Pcs)</option>
                              <option value="Pasta">🍝 Pasta (1 Box = 10 Pcs)</option>
                              <option value="Rice">🍚 Rice (1 Bag = 10 Pcs)</option>
                              <option value="Oil">🛢️ Oil (1 Box = 12 Pcs)</option>
                              <option value="Milk">🥛 Milk (1 Crate = 20 Pcs)</option>
                              <option value="Tea">🍵 Tea (1 Box = 24 Pcs)</option>
                              <option value="Coffee">☕ Coffee (1 Box = 12 Pcs)</option>
                            </optgroup>
                            <optgroup label="Personal Care">
                              <option value="Shampoo">🧴 Shampoo (1 Box = 12 Pcs)</option>
                              <option value="Toothpaste">🪥 Toothpaste (1 Box = 12 Pcs)</option>
                              <option value="Cream">🧴 Cream (1 Box = 12 Pcs)</option>
                              <option value="Detergent">🧺 Detergent (1 Box = 6 Pcs)</option>
                              <option value="Sanitizer">🧴 Sanitizer (1 Box = 24 Pcs)</option>
                            </optgroup>
                            <optgroup label="Stationery & Office">
                              <option value="Stationery">📝 Stationery (1 Box = 10 Pcs)</option>
                              <option value="Pens">🖊️ Pens (1 Box = 10 Pcs)</option>
                              <option value="Notebooks">📓 Notebooks (1 Pack = 6 Pcs)</option>
                              <option value="Pencils">✏️ Pencils (1 Box = 12 Pcs)</option>
                            </optgroup>
                            <optgroup label="Electronics & Others">
                              <option value="Batteries">🔋 Batteries (1 Pack = 4 Pcs)</option>
                              <option value="Bulbs">💡 Bulbs (1 Box = 10 Pcs)</option>
                              <option value="Electronics">🔌 Electronics</option>
                              <option value="Furniture">🪑 Furniture</option>
                            </optgroup>
                            <optgroup label="Health">
                              <option value="Tablets">💊 Tablets (1 Strip = 10 Pcs)</option>
                              <option value="Syrup">🧪 Syrup (1 Box = 12 Pcs)</option>
                            </optgroup>
                            <optgroup label="General">
                              <option value="General">📦 General (1 Box = 12 Pcs)</option>
                              <option value="Other">📋 Other</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Description with {t.inventory.aiSuggestions} */}
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              {t.inventory.description}
                              {itemName && itemName.length > 2 && (
                                <Star size={12} weight="duotone" className="text-amber-500" />
                              )}
                            </span>
                            {itemName && itemName.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setShowDescriptionAI(!showDescriptionAI)}
                                className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
                              >
                                <Star size={10} weight="fill" />
                                {t.inventory.aiSuggest}
                              </button>
                            )}
                          </label>
                          <textarea
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            rows={2}
                            placeholder={t.inventory.briefDescription}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                          />
                          {showDescriptionAI && itemName && itemName.length > 2 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 space-y-1"
                            >
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Star size={10} weight="duotone" className="text-amber-500" />
                                {t.inventory.aiSuggestions} - Click to use:
                              </p>
                              {(() => {
                                try {
                                  return getDescriptionSuggestions(itemName).map((suggestion, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setItemDescription(suggestion)
                                        setShowDescriptionAI(false)
                                      }}
                                      className="w-full text-left px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-xs text-amber-900 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                  ))
                                } catch (error) {
                                  console.error('Error generating suggestions:', error)
                                  return null
                                }
                              })()}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Pricing */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <CurrencyInr size={16} weight="duotone" />
                        {t.inventory.pricing}
                      </h3>

                      {/* Side-by-Side Pricing Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* LEFT: Retail Selling Price (Blue) */}
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                          <label className="text-xs font-semibold mb-1.5 block text-blue-900">
                            {t.inventory.retailSellingPrice} <span className="text-destructive">*</span>
                          </label>

                          {/* Price Input */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-semibold">₹</span>
                            <input
                              type="number"
                              value={retailPrice}
                              onChange={(e) => {
                                const retailPriceValue = e.target.value
                                handleRetailPriceChange(retailPriceValue)

                                // Auto-calculate wholesale price as 70% of retail price
                                if (retailPriceValue && parseFloat(retailPriceValue) > 0) {
                                  const wholesalePriceValue = (parseFloat(retailPriceValue) * 0.3).toFixed(2)
                                  setWholesalePrice(wholesalePriceValue)
                                  setShowWholesalePrice(true)
                                }
                              }}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                            />
                          </div>

                          {/* Tax Mode Toggle */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTaxMode('exclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                taxMode === 'exclusive'
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-blue-300 text-blue-700 hover:border-blue-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                taxMode === 'exclusive' ? "border-white" : "border-blue-400"
                              )}>
                                {taxMode === 'exclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withoutGst}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaxMode('inclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                taxMode === 'inclusive'
                                  ? "bg-green-600 border-green-600 text-white"
                                  : "bg-white border-green-300 text-green-700 hover:border-green-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                taxMode === 'inclusive' ? "border-white" : "border-green-400"
                              )}>
                                {taxMode === 'inclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withGst}</span>
                            </button>
                          </div>

                          {/* Calculation Display */}
                          {retailPrice && parseFloat(retailPrice) > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg"
                            >
                              <div className="text-xs text-blue-800 font-medium">
                                {taxMode === 'inclusive' ? (
                                  <>
                                    Base Price: ₹{(parseFloat(retailPrice) / (1 + parseFloat(gstRate) / 100)).toFixed(2)} + GST ₹{(parseFloat(retailPrice) - (parseFloat(retailPrice) / (1 + parseFloat(gstRate) / 100))).toFixed(2)} = ₹{parseFloat(retailPrice).toFixed(2)}
                                  </>
                                ) : (
                                  <>
                                    Price: ₹{parseFloat(retailPrice).toFixed(2)} + GST @{gstRate}%: ₹{(parseFloat(retailPrice) * parseFloat(gstRate) / 100).toFixed(2)} = ₹{(parseFloat(retailPrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-blue-700 font-semibold mt-1">
                                {t.inventory.customerPays}: ₹{taxMode === 'inclusive' ? parseFloat(retailPrice).toFixed(2) : (parseFloat(retailPrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* RIGHT: {t.inventory.purchasePrice} (Orange) */}
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg space-y-3">
                          <label className="text-xs font-semibold mb-1.5 block text-orange-900">
                            {t.inventory.purchasePrice}
                          </label>

                          {/* Price Input */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-sm font-semibold">₹</span>
                            <input
                              type="number"
                              value={purchasePrice}
                              onChange={(e) => setPurchasePrice(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none font-semibold"
                            />
                          </div>

                          {/* Tax Mode Toggle */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPurchaseTaxMode('exclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                purchaseTaxMode === 'exclusive'
                                  ? "bg-orange-600 border-orange-600 text-white"
                                  : "bg-white border-orange-300 text-orange-700 hover:border-orange-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                purchaseTaxMode === 'exclusive' ? "border-white" : "border-orange-400"
                              )}>
                                {purchaseTaxMode === 'exclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withoutGst}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPurchaseTaxMode('inclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                purchaseTaxMode === 'inclusive'
                                  ? "bg-orange-600 border-orange-600 text-white"
                                  : "bg-white border-orange-300 text-orange-700 hover:border-orange-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                purchaseTaxMode === 'inclusive' ? "border-white" : "border-orange-400"
                              )}>
                                {purchaseTaxMode === 'inclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withGst}</span>
                            </button>
                          </div>

                          {/* Calculation Display */}
                          {purchasePrice && parseFloat(purchasePrice) > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg"
                            >
                              <div className="text-xs text-orange-800 font-medium">
                                {purchaseTaxMode === 'inclusive' ? (
                                  <>
                                    Base Purchase: ₹{(parseFloat(purchasePrice) / (1 + parseFloat(gstRate) / 100)).toFixed(2)} + GST ₹{(parseFloat(purchasePrice) - (parseFloat(purchasePrice) / (1 + parseFloat(gstRate) / 100))).toFixed(2)} = ₹{parseFloat(purchasePrice).toFixed(2)}
                                  </>
                                ) : (
                                  <>
                                    Purchase: ₹{parseFloat(purchasePrice).toFixed(2)} + GST @{gstRate}%: ₹{(parseFloat(purchasePrice) * parseFloat(gstRate) / 100).toFixed(2)} = ₹{(parseFloat(purchasePrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-orange-700 font-semibold mt-1">
                                {t.inventory.youPaidSupplier}: ₹{purchaseTaxMode === 'inclusive' ? parseFloat(purchasePrice).toFixed(2) : (parseFloat(purchasePrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Item Type */}
                      <div className="mt-3">
                        <label className="text-xs font-medium mb-1.5 block">{t.inventory.itemIsFor}</label>
                        <div className="flex gap-2">
                          {['sales', 'purchase', 'both'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setItemType(type)}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize border-2",
                                itemType === type
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-muted border-border hover:border-primary/30"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Profit Margin Display */}
                      {retailPrice && purchasePrice && parseFloat(retailPrice) > 0 && parseFloat(purchasePrice) > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 px-4 py-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-900">{t.inventory.profitMargin}:</span>
                            <div className="text-right">
                              <div className="text-sm font-bold text-emerald-700">
                                ₹{(parseFloat(retailPrice) - parseFloat(purchasePrice)).toFixed(2)}
                              </div>
                              <div className="text-xs text-emerald-600">
                                ({((parseFloat(retailPrice) - parseFloat(purchasePrice)) / parseFloat(retailPrice) * 100).toFixed(1)}% margin)
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Expandable: {t.inventory.wholesalePrice} */}
                      <div className="mt-3">
                        {!showWholesalePrice ? (
                          <button
                            type="button"
                            onClick={() => setShowWholesalePrice(true)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <Plus size={14} weight="bold" />
                            {t.inventory.wholesalePrice}
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            <label className="text-xs font-medium mb-1.5 block">
                              {t.inventory.wholesalePrice}
                              <span className="ml-1.5 text-[10px] text-emerald-600 font-normal">(Auto-filled: 30% of MRP)</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                              <input
                                type="number"
                                value={wholesalePrice}
                                onChange={(e) => setWholesalePrice(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Tax & Category */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Percent size={16} weight="duotone" />
                        {t.inventory.taxCompliance}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* CGST% */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-emerald-600">CGST%</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={cgstRate}
                            onChange={(e) => {
                              const value = e.target.value
                              setCgstRate(value)
                              // Auto-sync SGST to match CGST for intrastate
                              setSgstRate(value)
                              // Update total GST rate
                              setGstRate((parseFloat(value) * 2).toString())
                              // Clear IGST when using CGST+SGST
                              setIgstRate('0')
                            }}
                            className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-center font-semibold"
                            placeholder="9"
                          />
                        </div>

                        {/* SGST% */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-emerald-600">SGST%</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={sgstRate}
                            onChange={(e) => {
                              const value = e.target.value
                              setSgstRate(value)
                              // Auto-sync CGST to match SGST for intrastate
                              setCgstRate(value)
                              // Update total GST rate
                              setGstRate((parseFloat(value) * 2).toString())
                              // Clear IGST when using CGST+SGST
                              setIgstRate('0')
                            }}
                            className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-center font-semibold"
                            placeholder="9"
                          />
                        </div>

                        {/* IGST% */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-blue-600">IGST%</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={igstRate}
                            onChange={(e) => {
                              const value = e.target.value
                              setIgstRate(value)
                              // Update total GST rate
                              setGstRate(value)
                              // Clear CGST+SGST when using IGST
                              setCgstRate('0')
                              setSgstRate('0')
                            }}
                            className="w-full px-3 py-2.5 bg-blue-50 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <p className="text-[10px] text-muted-foreground px-3">
                          💡 <strong>{t.inventory.intrastate}:</strong> CGST + SGST | <strong>{t.inventory.interstate}:</strong> IGST only
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* Expandable: {t.inventory.hsnCode} */}
                        <div>
                          {!showHSN ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowHSN(true)}
                                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-6"
                              >
                                <Plus size={14} weight="bold" />
                                {t.inventory.hsnCode}
                              </button>

                              {/* AI HSN Suggestions Badge */}
                              {hsnSuggestions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                                >
                                  <div className="flex items-start gap-2">
                                    <Star size={16} weight="fill" className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-emerald-800 mb-1">
                                        AI suggested HSN codes for "{itemName.substring(0, 20)}{itemName.length > 20 ? '...' : ''}"
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowHSN(true)
                                          setShowHSNSuggestions(true)
                                        }}
                                        className="text-xs text-emerald-700 font-medium hover:text-emerald-900 underline"
                                      >
                                        View {hsnSuggestions.length} suggestion{hsnSuggestions.length > 1 ? 's' : ''}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-2"
                            >
                              <label className="text-xs font-medium mb-1.5 block">
                                {t.inventory.hsnCode} (Optional)
                                <span className="ml-1.5 text-[10px] text-blue-600 font-normal">(Auto-filled from Category)</span>
                              </label>
                              <input
                                type="text"
                                value={hsnCode}
                                onChange={(e) => setHsnCode(e.target.value)}
                                placeholder="e.g., 9609 for pens"
                                className="w-full px-3 py-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />

                              {/* AI HSN Suggestions Dropdown */}
                              {showHSNSuggestions && hsnSuggestions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white border-2 border-emerald-200 rounded-lg shadow-lg overflow-hidden"
                                >
                                  <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Star size={14} weight="fill" className="text-emerald-600" />
                                      <span className="text-xs font-semibold text-emerald-800">{t.inventory.aiSuggestions}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setShowHSNSuggestions(false)}
                                      className="text-emerald-600 hover:text-emerald-800"
                                    >
                                      <X size={14} weight="bold" />
                                    </button>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {hsnSuggestions.map((suggestion, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={() => {
                                          setHsnCode(suggestion.code)
                                          setGstRate(suggestion.gstRate.toString())
                                          setShowHSNSuggestions(false)
                                          toast.success(`{t.inventory.hsnCode} ${suggestion.code} applied with ${suggestion.gstRate}% GST`)
                                        }}
                                        className="w-full px-3 py-2.5 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-sm font-bold text-primary">{suggestion.code}</span>
                                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                                                {suggestion.gstRate}% GST
                                              </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                                          </div>
                                          <ArrowRight size={14} className="text-muted-foreground flex-shrink-0 mt-1" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Stock Management */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Package size={16} weight="duotone" />
                        {t.inventory.stockManagement}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Stock Quantity with Unit Selector */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">{t.inventory.openingStock}</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={stockQuantity}
                              onChange={(e) => setStockQuantity(e.target.value)}
                              placeholder="0"
                              className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                            {/* Unit selector - only show when multi-unit is enabled */}
                            {hasMultiUnit && (
                              <select
                                value={stockEntryUnit}
                                onChange={(e) => setStockEntryUnit(e.target.value)}
                                className="w-24 px-2 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              >
                                <option value={baseUnit}>{baseUnit}</option>
                                <option value={purchaseUnit}>{purchaseUnit}</option>
                              </select>
                            )}
                          </div>
                          {/* Show conversion info when entering in boxes */}
                          {hasMultiUnit && stockQuantity && stockEntryUnit === purchaseUnit && (
                            <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                              = {parseInt(stockQuantity || '0') * parseInt(piecesPerPurchaseUnit || '12')} {baseUnit} total
                            </p>
                          )}
                        </div>

                        {/* Expandable: {t.inventory.lowStockAlert} */}
                        <div>
                          {!showLowStockAlert ? (
                            <button
                              type="button"
                              onClick={() => setShowLowStockAlert(true)}
                              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-6"
                            >
                              <Bell size={14} weight="duotone" />
                              {t.inventory.lowStockAlert}
                            </button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                            >
                              <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                                <Bell size={12} weight="duotone" />
                                {t.inventory.lowStockAlertQty}
                              </label>
                              <input
                                type="number"
                                value={lowStockAlert}
                                onChange={(e) => setLowStockAlert(e.target.value)}
                                placeholder="e.g., 5"
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {t.inventory.alertBelowQty}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Expiry Date - Optional */}
                      <div>
                        <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                          <Calendar size={12} weight="duotone" />
                          Expiry Date
                          <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          For perishable items only
                        </p>
                      </div>
                    </div>

                    {/* Section 5: {t.inventory.multiUnitConversion} */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <Package size={16} weight="duotone" />
                          {t.inventory.multiUnitConversion}
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasMultiUnit}
                            onChange={(e) => setHasMultiUnit(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-medium">{t.inventory.enable}</span>
                        </label>
                      </div>

                      {hasMultiUnit && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <p className="text-xs text-muted-foreground">
                            {t.inventory.multiUnitInfo}
                          </p>

                          {/* Row 1: Units and Quantity */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* Base Unit (Selling) */}
                            <div>
                              <label className="text-xs font-medium mb-1.5 block">{t.inventory.baseUnitSale}</label>
                              <select
                                value={baseUnit}
                                onChange={(e) => setBaseUnit(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              >
                                <option value="Pcs">Pieces (Pcs)</option>
                                <option value="Kg">Kilogram (Kg)</option>
                                <option value="Ltr">Liter (Ltr)</option>
                                <option value="Mtr">Meter (Mtr)</option>
                                <option value="Unit">Unit</option>
                              </select>
                            </div>

                            {/* Purchase Unit */}
                            <div>
                              <label className="text-xs font-medium mb-1.5 block">{t.inventory.purchaseUnitLabel}</label>
                              <select
                                value={purchaseUnit}
                                onChange={(e) => setPurchaseUnit(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              >
                                <option value="Box">Box</option>
                                <option value="Carton">Carton</option>
                                <option value="Pack">Pack</option>
                                <option value="Dozen">Dozen</option>
                                <option value="Case">Case</option>
                                <option value="Bundle">Bundle</option>
                              </select>
                            </div>

                            {/* Pieces per Purchase Unit */}
                            <div>
                              <label className="text-xs font-medium mb-1.5 block">{baseUnit} per {purchaseUnit}</label>
                              <input
                                type="number"
                                min="1"
                                value={piecesPerPurchaseUnit}
                                onChange={(e) => setPiecesPerPurchaseUnit(e.target.value)}
                                placeholder="12"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                          </div>

                          {/* Box/Pack Pricing - Editable with Auto-Sync */}
                          <div className="p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50 border-2 border-blue-200 rounded-lg space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                📦 Box/Pack Pricing Calculator
                              </h4>
                              <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                                ✓ 100% Auto
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mb-3">
                              Based on your Retail Price (₹{retailPrice || '0'}) and {t.inventory.purchasePrice} (₹{purchasePrice || '0'}) per piece:
                            </p>

                            {/* Editable Box Prices */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Box Selling Price - EDITABLE */}
                              <div>
                                <label className="text-xs font-medium mb-1.5 block text-blue-700">
                                  📦 {purchaseUnit} Selling Price (MRP)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-semibold">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={boxSellingPrice}
                                    onChange={(e) => handleBoxSellingPriceChange(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                </div>
                                <p className="text-[10px] text-blue-600 mt-1">
                                  ₹{retailPrice || '0'} × {piecesPerPurchaseUnit} pcs
                                </p>
                              </div>

                              {/* Box {t.inventory.purchasePrice} - EDITABLE */}
                              <div>
                                <label className="text-xs font-medium mb-1.5 block text-orange-700">
                                  🏷️ {purchaseUnit} {t.inventory.purchasePrice}
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-sm font-semibold">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={boxPurchasePrice}
                                    onChange={(e) => handleBoxPurchasePriceChange(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-orange-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                                  />
                                </div>
                                <p className="text-[10px] text-orange-600 mt-1">
                                  ₹{purchasePrice || '0'} × {piecesPerPurchaseUnit} pcs
                                </p>
                              </div>
                            </div>

                            {/* Profit per Box */}
                            {profitPerBox && (
                              <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                parseFloat(profitPerBox) > 0
                                  ? 'bg-green-100 border-green-400'
                                  : parseFloat(profitPerBox) < 0
                                    ? 'bg-red-100 border-red-400'
                                    : 'bg-gray-100 border-gray-300'
                              }`}>
                                <div>
                                  <p className={`text-xs font-medium ${
                                    parseFloat(profitPerBox) > 0 ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    💰 Profit per {purchaseUnit}
                                  </p>
                                  <p className={`text-[10px] mt-0.5 ${
                                    parseFloat(profitPerBox) > 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    ₹{boxSellingPrice || '0'} - ₹{boxPurchasePrice || '0'}
                                  </p>
                                </div>
                                <span className={`text-lg font-bold ${
                                  parseFloat(profitPerBox) > 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {parseFloat(profitPerBox) > 0 ? '+' : ''}₹{profitPerBox}
                                </span>
                              </div>
                            )}

                            {/* Margin % */}
                            {profitMarginPercent && (
                              <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                parseFloat(profitMarginPercent) > 0
                                  ? 'bg-purple-100 border-purple-400'
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <div>
                                  <p className={`text-xs font-medium ${
                                    parseFloat(profitMarginPercent) > 0 ? 'text-purple-900' : 'text-gray-700'
                                  }`}>
                                    📊 Profit Margin %
                                  </p>
                                  <p className={`text-[10px] mt-0.5 ${
                                    parseFloat(profitMarginPercent) > 0 ? 'text-purple-700' : 'text-gray-600'
                                  }`}>
                                    (Profit / Purchase) × 100
                                  </p>
                                </div>
                                <span className={`text-lg font-bold ${
                                  parseFloat(profitMarginPercent) > 0 ? 'text-purple-700' : 'text-gray-600'
                                }`}>
                                  {parseFloat(profitMarginPercent) > 0 ? '+' : ''}{profitMarginPercent}%
                                </span>
                              </div>
                            )}

                            {/* Note */}
                            <p className="text-[10px] text-gray-500 italic mt-3 text-center">
                              💡 Edit either piece prices or box prices - both sync automatically!
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Section 6: Additional Details (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground">{t.inventory.optionalDetails}</p>

                      {/* Expandable: Brand */}
                      {!showBrand ? (
                        <button
                          type="button"
                          onClick={() => setShowBrand(true)}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          <Plus size={14} weight="bold" />
                          {t.inventory.brandName}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1.5"
                        >
                          <label className="text-xs font-medium mb-1.5 block">{t.inventory.brandName}</label>
                          <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="e.g., Cello, Parker, HP"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </motion.div>
                      )}

                      {/* Expandable: Barcode */}
                      {!showBarcode ? (
                        <button
                          type="button"
                          onClick={() => setShowBarcode(true)}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          <Barcode size={14} weight="duotone" />
                          {t.inventory.barcodeSku}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1.5"
                        >
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Barcode size={12} weight="duotone" />
                            {t.inventory.barcodeSku} Number
                            <span className="text-muted-foreground text-[10px] ml-auto">
                              {isMobileDevice ? 'Tap camera to scan' : 'Type or use scanner'}
                            </span>
                          </label>
                          <div className="relative flex gap-2">
                            <input
                              type="text"
                              value={barcodeNumber}
                              onChange={(e) => setBarcodeNumber(e.target.value)}
                              onKeyDown={(e) => {
                                // USB/Bluetooth scanner detection - rapid Enter key
                                if (e.key === 'Enter') {
                                  const now = Date.now()
                                  // If Enter pressed within 100ms of last input, it's likely a scanner
                                  if (now - lastScanTime < 100 && barcodeNumber.trim()) {
                                    e.preventDefault()
                                    toast.success(`✅ Barcode scanned: ${barcodeNumber}`)
                                  }
                                  setLastScanTime(now)
                                }
                              }}
                              onInput={() => setLastScanTime(Date.now())}
                              placeholder={isMobileDevice ? "Tap camera or type barcode" : "Enter or scan barcode"}
                              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                            />
                            {/* Camera button for mobile scanning */}
                            <button
                              type="button"
                              onClick={() => setShowBarcodeScanner(true)}
                              className={cn(
                                "px-3 py-2 rounded-lg border border-border transition-all flex items-center gap-1.5",
                                isMobileDevice
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                              title={isMobileDevice ? "Open camera scanner" : "Camera scanner"}
                            >
                              <Camera size={18} weight="duotone" />
                              {isMobileDevice && <span className="text-xs">Scan</span>}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-border flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors text-sm"
                  >
                    {t.inventory.cancel}
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <ArrowsClockwise size={18} weight="duotone" className="animate-spin" />
                        {t.inventory.savingItem}
                      </>
                    ) : (
                      <>
                        <Package size={18} weight="duotone" />
                        {t.inventory.addItem}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* {t.inventory.editItem} Modal */}
      <AnimatePresence>
        {showEditModal && selectedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false)
                setSelectedItem(null)
                resetForm()
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowEditModal(false); setSelectedItem(null); resetForm(); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <Pencil size={24} weight="duotone" className="text-amber-600" />
                      {t.inventory.editItem}
                    </h2>
                    <button
                      onClick={() => {
                        setShowEditModal(false)
                        setSelectedItem(null)
                        resetForm()
                      }}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X size={20} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content - Same as Add Modal */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="space-y-5">
                    {/* Section 1: Basic Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Cube size={16} weight="duotone" />
                        {t.inventory.basicInfo}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Item Name */}
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium mb-1.5 block">
                            Item Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="Enter item name"
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          />
                        </div>

                        {/* Unit Type */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Scales size={14} weight="duotone" />
                            {t.inventory.unitType} <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={unitType}
                            onChange={(e) => setUnitType(e.target.value)}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            <option value="NONE">{t.inventory.none}</option>
                            <option value="PCS">{t.inventory.pieces}</option>
                            <option value="KGS">{t.inventory.kilogram}</option>
                            <option value="LTRS">{t.inventory.liter}</option>
                            <option value="MTR">{t.inventory.meter}</option>
                            <option value="BOX">{t.inventory.box}</option>
                            <option value="PACK">{t.inventory.pack}</option>
                            <option value="SET">{t.inventory.set}</option>
                            {/* Custom units from Item Settings - filter out duplicates */}
                            {(() => {
                              // Default unit values/names to filter out
                              const defaultUnits = ['NONE', 'PCS', 'KGS', 'LTRS', 'MTR', 'BOX', 'PACK', 'SET', 'pieces', 'kilogram', 'liter', 'meter', 'box', 'pack', 'set', 'kg', 'ltr']
                              const filteredUnits = customUnits.filter(unit => {
                                const unitLower = unit.toLowerCase()
                                const unitAbbr = unit.match(/\(([^)]+)\)/)?.[1]?.toLowerCase() || ''
                                // Check if this custom unit matches any default unit
                                return !defaultUnits.some(def =>
                                  unitLower.includes(def.toLowerCase()) ||
                                  unitAbbr === def.toLowerCase() ||
                                  def.toLowerCase() === unitLower
                                )
                              })
                              return filteredUnits.length > 0 ? (
                                <optgroup label="Custom Units">
                                  {filteredUnits.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </optgroup>
                              ) : null
                            })()}
                          </select>
                        </div>

                        {/* Category - Auto-fills Unit Conversion */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Tag size={14} weight="duotone" />
                            Category
                          </label>
                          <select
                            value={itemCategory}
                            onChange={(e) => {
                              const category = e.target.value
                              setItemCategory(category)
                              // Auto-fill unit conversion for edit mode
                              const categoryDefault = getCategoryDefault(category)
                              if (categoryDefault && !hasMultiUnit) {
                                setHasMultiUnit(true)
                                setBaseUnit('Pcs')
                                setPurchaseUnit(categoryDefault.alternateUnit)
                                setPiecesPerPurchaseUnit(categoryDefault.piecesPerUnit.toString())
                              }
                            }}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            {/* Custom Categories from Settings */}
                            {(() => {
                              const customCategories = getItemSettings().productCategories || []
                              const builtInCategories = ['Biscuits', 'Chips', 'Chocolate', 'Soap', 'Soft Drinks', 'Noodles', 'Juice', 'Water Bottles', 'Pasta', 'Oil', 'Milk', 'Tea', 'Coffee', 'Shampoo', 'Toothpaste', 'Detergent', 'Stationery', 'Pens', 'Notebooks', 'Batteries', 'Electronics', 'Furniture', 'General', 'Other']
                              const newCategories = customCategories.filter(c => !builtInCategories.includes(c))
                              if (newCategories.length > 0) {
                                return (
                                  <optgroup label="⭐ Your Categories">
                                    {newCategories.map(cat => (
                                      <option key={cat} value={cat}>📁 {cat}</option>
                                    ))}
                                  </optgroup>
                                )
                              }
                              return null
                            })()}
                            <optgroup label="Common Categories">
                              <option value="Biscuits">🍪 Biscuits</option>
                              <option value="Chips">🥔 Chips</option>
                              <option value="Chocolate">🍫 Chocolate</option>
                              <option value="Soap">🧼 Soap</option>
                              <option value="Soft Drinks">🥤 Soft Drinks</option>
                              <option value="Noodles">🍜 Noodles</option>
                            </optgroup>
                            <optgroup label="Food & Beverages">
                              <option value="Juice">🧃 Juice</option>
                              <option value="Water Bottles">💧 Water Bottles</option>
                              <option value="Pasta">🍝 Pasta</option>
                              <option value="Oil">🛢️ Oil</option>
                              <option value="Milk">🥛 Milk</option>
                              <option value="Tea">🍵 Tea</option>
                              <option value="Coffee">☕ Coffee</option>
                            </optgroup>
                            <optgroup label="Personal Care">
                              <option value="Shampoo">🧴 Shampoo</option>
                              <option value="Toothpaste">🪥 Toothpaste</option>
                              <option value="Detergent">🧺 Detergent</option>
                            </optgroup>
                            <optgroup label="Stationery & Office">
                              <option value="Stationery">📝 Stationery</option>
                              <option value="Pens">🖊️ Pens</option>
                              <option value="Notebooks">📓 Notebooks</option>
                            </optgroup>
                            <optgroup label="Electronics & Others">
                              <option value="Batteries">🔋 Batteries</option>
                              <option value="Electronics">🔌 Electronics</option>
                              <option value="Furniture">🪑 Furniture</option>
                            </optgroup>
                            <optgroup label="General">
                              <option value="General">📦 General</option>
                              <option value="Other">📋 Other</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium mb-1.5 block">Description</label>
                          <textarea
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            rows={2}
                            placeholder="Brief description of the item..."
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Pricing */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <CurrencyInr size={16} weight="duotone" />
                        {t.inventory.pricing}
                      </h3>

                      {/* Side-by-Side Pricing Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* LEFT: Retail Selling Price (Blue) */}
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
                          <label className="text-xs font-semibold mb-1.5 block text-blue-900">
                            {t.inventory.retailSellingPrice} <span className="text-destructive">*</span>
                          </label>

                          {/* Price Input */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-semibold">₹</span>
                            <input
                              type="number"
                              value={retailPrice}
                              onChange={(e) => {
                                const retailPriceValue = e.target.value
                                setRetailPrice(retailPriceValue)

                                // Auto-calculate wholesale price as 70% of retail price
                                if (retailPriceValue && parseFloat(retailPriceValue) > 0) {
                                  const wholesalePriceValue = (parseFloat(retailPriceValue) * 0.3).toFixed(2)
                                  setWholesalePrice(wholesalePriceValue)
                                  setShowWholesalePrice(true)
                                }
                              }}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                            />
                          </div>

                          {/* Tax Mode Toggle */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTaxMode('exclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                taxMode === 'exclusive'
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-blue-300 text-blue-700 hover:border-blue-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                taxMode === 'exclusive' ? "border-white" : "border-blue-400"
                              )}>
                                {taxMode === 'exclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withoutGst}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaxMode('inclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                taxMode === 'inclusive'
                                  ? "bg-green-600 border-green-600 text-white"
                                  : "bg-white border-green-300 text-green-700 hover:border-green-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                taxMode === 'inclusive' ? "border-white" : "border-green-400"
                              )}>
                                {taxMode === 'inclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withGst}</span>
                            </button>
                          </div>

                          {/* Calculation Display */}
                          {retailPrice && parseFloat(retailPrice) > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-3 py-2 bg-blue-100 border border-blue-300 rounded-lg"
                            >
                              <div className="text-xs text-blue-800 font-medium">
                                {taxMode === 'inclusive' ? (
                                  <>
                                    Base Price: ₹{(parseFloat(retailPrice) / (1 + parseFloat(gstRate) / 100)).toFixed(2)} + GST ₹{(parseFloat(retailPrice) - (parseFloat(retailPrice) / (1 + parseFloat(gstRate) / 100))).toFixed(2)} = ₹{parseFloat(retailPrice).toFixed(2)}
                                  </>
                                ) : (
                                  <>
                                    Price: ₹{parseFloat(retailPrice).toFixed(2)} + GST @{gstRate}%: ₹{(parseFloat(retailPrice) * parseFloat(gstRate) / 100).toFixed(2)} = ₹{(parseFloat(retailPrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-blue-700 font-semibold mt-1">
                                {t.inventory.customerPays}: ₹{taxMode === 'inclusive' ? parseFloat(retailPrice).toFixed(2) : (parseFloat(retailPrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* RIGHT: {t.inventory.purchasePrice} (Orange) */}
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg space-y-3">
                          <label className="text-xs font-semibold mb-1.5 block text-orange-900">
                            {t.inventory.purchasePrice}
                          </label>

                          {/* Price Input */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-sm font-semibold">₹</span>
                            <input
                              type="number"
                              value={purchasePrice}
                              onChange={(e) => setPurchasePrice(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none font-semibold"
                            />
                          </div>

                          {/* Tax Mode Toggle */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPurchaseTaxMode('exclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                purchaseTaxMode === 'exclusive'
                                  ? "bg-orange-600 border-orange-600 text-white"
                                  : "bg-white border-orange-300 text-orange-700 hover:border-orange-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                purchaseTaxMode === 'exclusive' ? "border-white" : "border-orange-400"
                              )}>
                                {purchaseTaxMode === 'exclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withoutGst}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPurchaseTaxMode('inclusive')}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center gap-1.5",
                                purchaseTaxMode === 'inclusive'
                                  ? "bg-orange-600 border-orange-600 text-white"
                                  : "bg-white border-orange-300 text-orange-700 hover:border-orange-400"
                              )}
                            >
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                                purchaseTaxMode === 'inclusive' ? "border-white" : "border-orange-400"
                              )}>
                                {purchaseTaxMode === 'inclusive' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                              <span className="font-bold">{t.inventory.withGst}</span>
                            </button>
                          </div>

                          {/* Calculation Display */}
                          {purchasePrice && parseFloat(purchasePrice) > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg"
                            >
                              <div className="text-xs text-orange-800 font-medium">
                                {purchaseTaxMode === 'inclusive' ? (
                                  <>
                                    Base Purchase: ₹{(parseFloat(purchasePrice) / (1 + parseFloat(gstRate) / 100)).toFixed(2)} + GST ₹{(parseFloat(purchasePrice) - (parseFloat(purchasePrice) / (1 + parseFloat(gstRate) / 100))).toFixed(2)} = ₹{parseFloat(purchasePrice).toFixed(2)}
                                  </>
                                ) : (
                                  <>
                                    Purchase: ₹{parseFloat(purchasePrice).toFixed(2)} + GST @{gstRate}%: ₹{(parseFloat(purchasePrice) * parseFloat(gstRate) / 100).toFixed(2)} = ₹{(parseFloat(purchasePrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-orange-700 font-semibold mt-1">
                                {t.inventory.youPaidSupplier}: ₹{purchaseTaxMode === 'inclusive' ? parseFloat(purchasePrice).toFixed(2) : (parseFloat(purchasePrice) * (1 + parseFloat(gstRate) / 100)).toFixed(2)}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Profit Margin Display */}
                      {retailPrice && purchasePrice && parseFloat(retailPrice) > 0 && parseFloat(purchasePrice) > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 px-4 py-3 bg-emerald-50 border-2 border-emerald-300 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-900">{t.inventory.profitMargin}:</span>
                            <div className="text-right">
                              <div className="text-sm font-bold text-emerald-700">
                                ₹{(parseFloat(retailPrice) - parseFloat(purchasePrice)).toFixed(2)}
                              </div>
                              <div className="text-xs text-emerald-600">
                                ({((parseFloat(retailPrice) - parseFloat(purchasePrice)) / parseFloat(retailPrice) * 100).toFixed(1)}% margin)
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Section 3: Tax */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Percent size={16} weight="duotone" />
                        {t.inventory.taxCompliance}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* CGST% */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-emerald-600">CGST%</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={cgstRate}
                            onChange={(e) => {
                              const value = e.target.value
                              setCgstRate(value)
                              // Auto-sync SGST to match CGST for intrastate
                              setSgstRate(value)
                              // Update total GST rate
                              setGstRate((parseFloat(value) * 2).toString())
                              // Clear IGST when using CGST+SGST
                              setIgstRate('0')
                            }}
                            className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-center font-semibold"
                            placeholder="9"
                          />
                        </div>

                        {/* SGST% */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-emerald-600">SGST%</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={sgstRate}
                            onChange={(e) => {
                              const value = e.target.value
                              setSgstRate(value)
                              // Auto-sync CGST to match SGST for intrastate
                              setCgstRate(value)
                              // Update total GST rate
                              setGstRate((parseFloat(value) * 2).toString())
                              // Clear IGST when using CGST+SGST
                              setIgstRate('0')
                            }}
                            className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-center font-semibold"
                            placeholder="9"
                          />
                        </div>

                        {/* IGST% */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block text-blue-600">IGST%</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={igstRate}
                            onChange={(e) => {
                              const value = e.target.value
                              setIgstRate(value)
                              // Update total GST rate
                              setGstRate(value)
                              // Clear CGST+SGST when using IGST
                              setCgstRate('0')
                              setSgstRate('0')
                            }}
                            className="w-full px-3 py-2.5 bg-blue-50 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <p className="text-[10px] text-muted-foreground px-3">
                          💡 <strong>{t.inventory.intrastate}:</strong> CGST + SGST | <strong>{t.inventory.interstate}:</strong> IGST only
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* {t.inventory.hsnCode} */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">HSN/SAC Code</label>
                          <input
                            type="text"
                            value={hsnCode}
                            onChange={(e) => setHsnCode(e.target.value)}
                            placeholder="e.g., 3926"
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Stock */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Stack size={16} weight="duotone" />
                        Stock Management
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Stock Quantity */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Current Stock Quantity</label>
                          <input
                            type="number"
                            value={stockQuantity}
                            onChange={(e) => setStockQuantity(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>

                        {/* {t.inventory.lowStockAlert} */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Bell size={12} weight="duotone" />
                            {t.inventory.lowStockAlertQty}
                          </label>
                          <input
                            type="number"
                            value={lowStockAlert}
                            onChange={(e) => setLowStockAlert(e.target.value)}
                            placeholder="e.g., 5"
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: {t.inventory.multiUnitConversion} */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                          <Package size={16} weight="duotone" />
                          {t.inventory.multiUnitConversion}
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasMultiUnit}
                            onChange={(e) => setHasMultiUnit(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-medium">{t.inventory.enable}</span>
                        </label>
                      </div>

                      {hasMultiUnit && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <p className="text-xs text-muted-foreground">
                            {t.inventory.multiUnitInfo}
                          </p>

                          {/* Row 1: Units and Quantity */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* Base Unit (Selling) */}
                            <div>
                              <label className="text-xs font-medium mb-1.5 block">{t.inventory.baseUnitSale}</label>
                              <select
                                value={baseUnit}
                                onChange={(e) => setBaseUnit(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              >
                                <option value="Pcs">Pieces (Pcs)</option>
                                <option value="Kg">Kilogram (Kg)</option>
                                <option value="Ltr">Liter (Ltr)</option>
                                <option value="Mtr">Meter (Mtr)</option>
                                <option value="Unit">Unit</option>
                              </select>
                            </div>

                            {/* Purchase Unit */}
                            <div>
                              <label className="text-xs font-medium mb-1.5 block">{t.inventory.purchaseUnitLabel}</label>
                              <select
                                value={purchaseUnit}
                                onChange={(e) => setPurchaseUnit(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              >
                                <option value="Box">Box</option>
                                <option value="Carton">Carton</option>
                                <option value="Pack">Pack</option>
                                <option value="Dozen">Dozen</option>
                                <option value="Case">Case</option>
                                <option value="Bundle">Bundle</option>
                              </select>
                            </div>

                            {/* Pieces per Purchase Unit */}
                            <div>
                              <label className="text-xs font-medium mb-1.5 block">{baseUnit} per {purchaseUnit}</label>
                              <input
                                type="number"
                                min="1"
                                value={piecesPerPurchaseUnit}
                                onChange={(e) => setPiecesPerPurchaseUnit(e.target.value)}
                                placeholder="12"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                          </div>

                          {/* Box/Pack Pricing - Editable with Auto-Sync */}
                          <div className="p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50 border-2 border-blue-200 rounded-lg space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                📦 Box/Pack Pricing Calculator
                              </h4>
                              <span className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
                                ✓ 100% Auto
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mb-3">
                              Based on your Retail Price (₹{retailPrice || '0'}) and {t.inventory.purchasePrice} (₹{purchasePrice || '0'}) per piece:
                            </p>

                            {/* Editable Box Prices */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Box Selling Price - EDITABLE */}
                              <div>
                                <label className="text-xs font-medium mb-1.5 block text-blue-700">
                                  📦 {purchaseUnit} Selling Price (MRP)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-semibold">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={boxSellingPrice}
                                    onChange={(e) => handleBoxSellingPriceChange(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                </div>
                                <p className="text-[10px] text-blue-600 mt-1">
                                  ₹{retailPrice || '0'} × {piecesPerPurchaseUnit} pcs
                                </p>
                              </div>

                              {/* Box {t.inventory.purchasePrice} - EDITABLE */}
                              <div>
                                <label className="text-xs font-medium mb-1.5 block text-orange-700">
                                  🏷️ {purchaseUnit} {t.inventory.purchasePrice}
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 text-sm font-semibold">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={boxPurchasePrice}
                                    onChange={(e) => handleBoxPurchasePriceChange(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-3 py-2.5 bg-white border-2 border-orange-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                                  />
                                </div>
                                <p className="text-[10px] text-orange-600 mt-1">
                                  ₹{purchasePrice || '0'} × {piecesPerPurchaseUnit} pcs
                                </p>
                              </div>
                            </div>

                            {/* Profit per Box */}
                            {profitPerBox && (
                              <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                parseFloat(profitPerBox) > 0
                                  ? 'bg-green-100 border-green-400'
                                  : parseFloat(profitPerBox) < 0
                                    ? 'bg-red-100 border-red-400'
                                    : 'bg-gray-100 border-gray-300'
                              }`}>
                                <div>
                                  <p className={`text-xs font-medium ${
                                    parseFloat(profitPerBox) > 0 ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    💰 Profit per {purchaseUnit}
                                  </p>
                                  <p className={`text-[10px] mt-0.5 ${
                                    parseFloat(profitPerBox) > 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    ₹{boxSellingPrice || '0'} - ₹{boxPurchasePrice || '0'}
                                  </p>
                                </div>
                                <span className={`text-lg font-bold ${
                                  parseFloat(profitPerBox) > 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {parseFloat(profitPerBox) > 0 ? '+' : ''}₹{profitPerBox}
                                </span>
                              </div>
                            )}

                            {/* Margin % */}
                            {profitMarginPercent && (
                              <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                                parseFloat(profitMarginPercent) > 0
                                  ? 'bg-purple-100 border-purple-400'
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <div>
                                  <p className={`text-xs font-medium ${
                                    parseFloat(profitMarginPercent) > 0 ? 'text-purple-900' : 'text-gray-700'
                                  }`}>
                                    📊 Profit Margin %
                                  </p>
                                  <p className={`text-[10px] mt-0.5 ${
                                    parseFloat(profitMarginPercent) > 0 ? 'text-purple-700' : 'text-gray-600'
                                  }`}>
                                    (Profit / Purchase) × 100
                                  </p>
                                </div>
                                <span className={`text-lg font-bold ${
                                  parseFloat(profitMarginPercent) > 0 ? 'text-purple-700' : 'text-gray-600'
                                }`}>
                                  {parseFloat(profitMarginPercent) > 0 ? '+' : ''}{profitMarginPercent}%
                                </span>
                              </div>
                            )}

                            {/* Note */}
                            <p className="text-[10px] text-gray-500 italic mt-3 text-center">
                              💡 Edit either piece prices or box prices - both sync automatically!
                            </p>
                          </div>

                        </motion.div>
                      )}
                    </div>

                    {/* Section 6: Additional Details */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-muted-foreground">{t.inventory.optionalDetails}</h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Brand */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">{t.inventory.brandName}</label>
                          <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="e.g., Cello, Parker"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>

                        {/* Barcode */}
                        <div>
                          <label className="text-xs font-medium mb-1.5 block flex items-center gap-1">
                            <Barcode size={12} weight="duotone" />
                            {t.inventory.barcodeSku} Number
                            <span className="text-muted-foreground text-[10px] ml-auto">
                              {isMobileDevice ? 'Tap camera to scan' : 'Type or use scanner'}
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={barcodeNumber}
                              onChange={(e) => setBarcodeNumber(e.target.value)}
                              onKeyDown={(e) => {
                                // USB/Bluetooth scanner detection - rapid Enter key
                                if (e.key === 'Enter') {
                                  const now = Date.now()
                                  if (now - lastScanTime < 100 && barcodeNumber.trim()) {
                                    e.preventDefault()
                                    toast.success(`✅ Barcode scanned: ${barcodeNumber}`)
                                  }
                                  setLastScanTime(now)
                                }
                              }}
                              onInput={() => setLastScanTime(Date.now())}
                              placeholder={isMobileDevice ? "Tap camera or type barcode" : "Enter or scan barcode"}
                              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowBarcodeScanner(true)}
                              className={cn(
                                "px-3 py-2 rounded-lg border border-border transition-all flex items-center gap-1.5",
                                isMobileDevice
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                              title={isMobileDevice ? "Open camera scanner" : "Camera scanner"}
                            >
                              <Camera size={18} weight="duotone" />
                              {isMobileDevice && <span className="text-xs">Scan</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-4 border-t border-border flex gap-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedItem(null)
                      resetForm()
                    }}
                    className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors text-sm"
                  >
                    {t.inventory.cancel}
                  </button>
                  <button
                    onClick={saveEditedItem}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <ArrowsClockwise size={18} weight="duotone" className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <FloppyDisk size={18} weight="duotone" />
                        Update Item
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* View Item Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Item Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Item Name</label>
                <p className="font-medium">{selectedItem.name}</p>
              </div>
              {selectedItem.description && (
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p>{selectedItem.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Selling Price</label>
                  <p className="font-medium">₹{selectedItem.sellingPrice}</p>
                </div>
                {selectedItem.purchasePrice && (
                  <div>
                    <label className="text-sm text-muted-foreground">{t.inventory.purchasePrice}</label>
                    <p className="font-medium">₹{selectedItem.purchasePrice}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-muted-foreground">Stock</label>
                  <p className="font-medium">{selectedItem.stock || 0} {selectedItem.unit}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <p className="font-medium capitalize">{selectedItem.category}</p>
                </div>
                {selectedItem.hsnCode && (
                  <div>
                    <label className="text-sm text-muted-foreground">{t.inventory.hsnCode}</label>
                    <p className="font-medium">{selectedItem.hsnCode}</p>
                  </div>
                )}
                {selectedItem.barcode && (
                  <div>
                    <label className="text-sm text-muted-foreground">Barcode</label>
                    <p className="font-medium">{selectedItem.barcode}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-bold mb-2">Delete Item?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{selectedItem.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                {t.inventory.cancel}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dropdown Menu Portal */}
      {openActionMenu && dropdownPosition && createPortal(
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[9999] min-w-[140px]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          <button
            onClick={() => {
              const item = items.find(i => i.id === openActionMenu)
              if (item) handleViewItem(item)
              setOpenActionMenu(null)
            }}
            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Eye size={14} weight="duotone" />
            View Details
          </button>
          <button
            onClick={() => {
              const item = items.find(i => i.id === openActionMenu)
              if (item) {
                // Copy item name to clipboard
                navigator.clipboard.writeText(item.name)
                toast.success('Item name copied!')
              }
              setOpenActionMenu(null)
            }}
            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Barcode size={14} weight="duotone" />
            Copy Name
          </button>
        </div>,
        document.body
      )}

      {/* Camera Barcode Scanner Modal - Using proper BarcodeScanner component */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(barcode) => {
          setBarcodeNumber(barcode)
          toast.success(`✅ Barcode set: ${barcode}`)
        }}
        title="Scan Item Barcode"
      />
    </div>
  )
}

export default Inventory
