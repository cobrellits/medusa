"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSidebar } from "../Sidebar"
import { usePrevious } from "@uidotdev/usehooks"
import { SidebarItemType } from "types"

export type Page = {
  title: string
  description?: string
  parentTitle?: string
  link: string
}

export type PaginationContextType = {
  nextPage?: Page
  previousPage?: Page
}

export const PaginationContext = createContext<PaginationContextType | null>(
  null
)

type SidebarItemWithParent = SidebarItemType & {
  parent?: SidebarItemType
}

type SearchItemsResult = {
  foundActive: boolean
  prevItem?: SidebarItemWithParent
  nextItem?: SidebarItemWithParent
}

export type PaginationProviderProps = {
  children?: React.ReactNode
}

export const PaginationProvider = ({ children }: PaginationProviderProps) => {
  const { items, activePath } = useSidebar()
  const combinedItems = useMemo(() => [...items.top, ...items.bottom], [items])
  const previousActivePath = usePrevious(activePath)
  const [nextPage, setNextPage] = useState<Page | undefined>()
  const [prevPage, setPrevPage] = useState<Page | undefined>()

  const getFirstChild = (
    item: SidebarItemType
  ): SidebarItemWithParent | undefined => {
    const children = getChildrenWithPages(item)
    if (!children?.length) {
      return undefined
    }

    return children[0].path
      ? {
          ...children[0],
          parent: item,
        }
      : getFirstChild(children[0])
  }

  const getChildrenWithPages = (
    item: SidebarItemType
  ): SidebarItemWithParent[] | undefined => {
    return item.children?.filter(
      (childItem) =>
        childItem.path !== undefined || getChildrenWithPages(childItem)?.length
    )
  }

  const getPrevItem = (
    items: SidebarItemType[],
    index: number
  ): SidebarItemWithParent | undefined => {
    let foundItem: SidebarItemWithParent | undefined
    items
      .slice(0, index)
      .reverse()
      .some((item) => {
        if (item.children?.length) {
          const childItem = getPrevItem(item.children, item.children.length)
          if (childItem) {
            foundItem = {
              ...childItem,
              parent: item,
            }
          }
        } else if (item.path) {
          foundItem = item
        }

        return foundItem !== undefined
      })

    return foundItem
  }

  const getNextItem = (
    items: SidebarItemType[],
    index: number
  ): SidebarItemWithParent | undefined => {
    let foundItem: SidebarItemWithParent | undefined
    items.slice(index + 1).some((item) => {
      if (item.path) {
        foundItem = item
      } else if (item.children?.length) {
        const childItem = getNextItem(item.children, -1)
        if (childItem) {
          foundItem = {
            ...childItem,
            parent: item,
          }
        }
      }

      return foundItem !== undefined
    })

    return foundItem
  }

  const searchItems = (currentItems: SidebarItemType[]): SearchItemsResult => {
    const result: SearchItemsResult = {
      foundActive: false,
    }

    result.foundActive = currentItems.some((item, index) => {
      if (item.path === activePath) {
        if (index !== 0) {
          result.prevItem = getPrevItem(currentItems, index)
        }

        if (item.children?.length) {
          result.nextItem = getFirstChild(item)
        }

        if (!result.nextItem && index !== currentItems.length - 1) {
          result.nextItem = getNextItem(currentItems, index)
        }
        return true
      }

      if (item.children?.length) {
        const childrenResult = searchItems(item.children)

        if (childrenResult.foundActive) {
          result.prevItem = childrenResult.prevItem
          result.nextItem = childrenResult.nextItem
          if (!result.prevItem) {
            result.prevItem = item.path
              ? item
              : getPrevItem(currentItems, index)
          }

          if (!result.nextItem && index !== currentItems.length - 1) {
            result.nextItem = getNextItem(currentItems, index)
          }

          return true
        }
      }

      return false
    })

    return result
  }

  useEffect(() => {
    if (activePath !== previousActivePath) {
      const result = searchItems(combinedItems)
      setPrevPage(
        result.prevItem
          ? {
              title: result.prevItem.title,
              link: result.prevItem.path || "",
              parentTitle: result.prevItem.parent?.title,
            }
          : undefined
      )
      setNextPage(
        result.nextItem
          ? {
              title: result.nextItem.title,
              link: result.nextItem.path || "",
              parentTitle: result.nextItem.parent?.title,
            }
          : undefined
      )
    }
  }, [activePath, previousActivePath])

  return (
    <PaginationContext.Provider
      value={{
        previousPage: prevPage,
        nextPage,
      }}
    >
      {children}
    </PaginationContext.Provider>
  )
}

export const usePagination = (): PaginationContextType => {
  const context = useContext(PaginationContext)

  if (!context) {
    throw new Error("usePagination must be used inside a PaginationProvider")
  }

  return context
}
