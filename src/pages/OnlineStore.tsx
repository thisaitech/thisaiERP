import React, { useState } from 'react'
import {
  Plus,
  Storefront,
  ShoppingCart,
  Globe,
  TrendUp,
  Eye,
  Package,
  CurrencyCircleDollar,
  Users,
  Star,
  ShareNetwork,
  Link as LinkIcon,
  Copy,
  Palette,
  Gear,
  ChartBar,
  Bell
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

const OnlineStore = () => {
  const [storeActive, setStoreActive] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')

  const storeStats = {
    totalOrders: 156,
    revenue: 458900,
    visitors: 2845,
    products: 89,
    rating: 4.8,
    conversionRate: 5.5
  }

  const recentOrders = [
    {
      id: 'ORD001',
      customer: 'Rajesh Kumar',
      items: 3,
      amount: 12500,
      status: 'delivered',
      date: '2024-01-15'
    },
    {
      id: 'ORD002',
      customer: 'Priya Sharma',
      items: 1,
      amount: 4500,
      status: 'processing',
      date: '2024-01-15'
    },
    {
      id: 'ORD003',
      customer: 'Amit Patel',
      items: 5,
      amount: 23000,
      status: 'shipped',
      date: '2024-01-14'
    }
  ]

  const topProducts = [
    { id: 1, name: 'Premium Office Chair', sold: 45, revenue: 135000, image: '🪑' },
    { id: 2, name: 'Wireless Mouse', sold: 89, revenue: 89000, image: '🖱️' },
    { id: 3, name: 'Mechanical Keyboard', sold: 34, revenue: 102000, image: '⌨️' },
    { id: 4, name: 'Monitor Stand', sold: 56, revenue: 84000, image: '🖥️' }
  ]

  const copyStoreLink = () => {
    navigator.clipboard.writeText('https://store.businesspro.com/yourstore')
    toast.success('Store link copied to clipboard!')
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-accent via-primary to-accent/80 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">My Online Store</h1>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  storeActive
                    ? "bg-success/20 text-white border border-white/20"
                    : "bg-destructive/20 text-white border border-white/20"
                )}>
                  {storeActive ? '● Live' : '○ Offline'}
                </span>
              </div>
              <p className="text-white/80 text-sm">Manage your online presence and boost sales</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.info('Opening store settings...')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Gear size={20} weight="bold" />
              <span className="hidden sm:inline">Settings</span>
            </motion.button>
          </div>

          {/* Store Link */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Globe size={24} weight="duotone" className="text-white" />
                <div className="flex-1">
                  <p className="text-white/80 text-xs mb-1">Your Store URL</p>
                  <p className="text-white font-medium">store.businesspro.com/yourstore</p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyStoreLink}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Copy size={20} className="text-white" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toast.success('Opening store in new tab...')}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Eye size={20} className="text-white" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toast.info('Share your store...')}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ShareNetwork size={20} className="text-white" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <ShoppingCart size={24} weight="duotone" className="text-white mb-2" />
              <p className="text-2xl font-bold text-white">{storeStats.totalOrders}</p>
              <p className="text-white/80 text-xs">Total Orders</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <CurrencyCircleDollar size={24} weight="duotone" className="text-white mb-2" />
              <p className="text-2xl font-bold text-white">₹{(storeStats.revenue / 1000).toFixed(0)}k</p>
              <p className="text-white/80 text-xs">Revenue</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <Users size={24} weight="duotone" className="text-white mb-2" />
              <p className="text-2xl font-bold text-white">{storeStats.visitors}</p>
              <p className="text-white/80 text-xs">Visitors</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <Package size={24} weight="duotone" className="text-white mb-2" />
              <p className="text-2xl font-bold text-white">{storeStats.products}</p>
              <p className="text-white/80 text-xs">Products</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <Star size={24} weight="duotone" className="text-white mb-2" />
              <p className="text-2xl font-bold text-white">{storeStats.rating}</p>
              <p className="text-white/80 text-xs">Rating</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
            >
              <TrendUp size={24} weight="duotone" className="text-white mb-2" />
              <p className="text-2xl font-bold text-white">{storeStats.conversionRate}%</p>
              <p className="text-white/80 text-xs">Conversion</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Tabs */}
        <div className="bg-card rounded-lg shadow-lg border border-border mb-6">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBar },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'customize', label: 'Customize', icon: Palette }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2",
                  selectedTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon size={18} weight={selectedTab === tab.id ? "duotone" : "regular"} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Recent Orders</h3>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{order.id}</p>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        order.status === 'delivered' && "bg-success/10 text-success",
                        order.status === 'processing' && "bg-warning/10 text-warning",
                        order.status === 'shipped' && "bg-primary/10 text-primary"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.customer}</p>
                    <p className="text-xs text-muted-foreground">{order.items} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{order.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card rounded-lg shadow-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Top Products</h3>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-2xl">
                    {product.image}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{(product.revenue / 1000).toFixed(0)}k</p>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <TrendUp size={12} />
                      <span>12%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info('Add new product...')}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary transition-all"
          >
            <div className="p-3 bg-primary/10 rounded-lg">
              <Plus size={24} weight="duotone" className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Add Product</p>
              <p className="text-xs text-muted-foreground">List new item</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info('Customize store theme...')}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary transition-all"
          >
            <div className="p-3 bg-accent/10 rounded-lg">
              <Palette size={24} weight="duotone" className="text-accent" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Customize</p>
              <p className="text-xs text-muted-foreground">Theme & layout</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info('View analytics...')}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary transition-all"
          >
            <div className="p-3 bg-success/10 rounded-lg">
              <ChartBar size={24} weight="duotone" className="text-success" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Analytics</p>
              <p className="text-xs text-muted-foreground">View insights</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info('Manage notifications...')}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary transition-all"
          >
            <div className="p-3 bg-warning/10 rounded-lg">
              <Bell size={24} weight="duotone" className="text-warning" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Notifications</p>
              <p className="text-xs text-muted-foreground">Order alerts</p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default OnlineStore
